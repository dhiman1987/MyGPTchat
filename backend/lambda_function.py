
import boto3
import os
import time
import uuid
import json

from botocore.exceptions import ClientError

from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.indexes.vectorstore import VectorStoreIndexWrapper, VectorstoreIndexCreator
from langchain.vectorstores import Chroma
from langchain.document_loaders import S3DirectoryLoader
from langchain.document_loaders import TextLoader


chain: None = None
vector_store_exists = False
debug_mode = False
secret_name = "lambda-py-secret"
region_name = "ap-south-1"
bucket_name='dexter-bucket-778998'
vector_store_path='vector-store/persist'
vector_store_sqllite_path=vector_store_path+'/chroma.sqlite3'
aws_secret_openai_api_key='openai-api-key'
vector_store_s3_path="s3://"+bucket_name+"/"+vector_store_path

print("Initializing......change 4")
session = boto3.session.Session()
print("Boto3 Session created")
secret_client = session.client(service_name='secretsmanager',region_name=region_name)
s3_client = session.client(service_name='s3')

try:
    get_secret_value_response = secret_client.get_secret_value(SecretId=secret_name)
except ClientError as e:
    raise e
secrets = json.loads(get_secret_value_response['SecretString'])
openai_api_key = secrets[aws_secret_openai_api_key]
os.environ["OPENAI_API_KEY"] = openai_api_key
print("OpenAI API Key retrived")

openai_embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
print("OpenAI API embedding created")

try:
    vector_store = s3_client.get_object(Bucket=bucket_name,Key=vector_store_sqllite_path)
    vector_store_exists = True
    print("Vector store found in S3")
except ClientError as e:
    print(e)
    vector_store_exists = False

def download_directory_from_s3():
    s3_resource = boto3.resource('s3')
    bucket = s3_resource.Bucket(bucket_name) 
    for obj in bucket.objects.filter(Prefix = vector_store_path):
        output_path = obj.key.replace("vector-store","/tmp")
        if not os.path.exists(os.path.dirname(output_path)):
            print("making dir "+os.path.dirname(output_path))
            os.makedirs(os.path.dirname(output_path))
        print("downloading :"+obj.key+' to '+output_path)
        bucket.download_file(obj.key, output_path)
        print('\n download complete.....\n\n')

def upload_files_to_s3():
        root_file_path = '/tmp'
        for root, dirs, files in os.walk(root_file_path):
            for file_name in files:

                file_path = os.path.join(root, file_name)
                if not "persist" in file_path:
                    continue
                remote_file_path = file_path.replace(f'{root_file_path}/persist',vector_store_path)
                print(f'uploading {file_path} --> {remote_file_path}')
                try:
                    response = s3_client.upload_file(file_path, bucket_name, remote_file_path)
                    print(f'Uploaded {file_path} --> {remote_file_path}. Response {response}')
                    print(response)
                except ClientError as e:
                    print(e)


def intialize_vector_store():
    print("Initializing Vector store...")
    loader = TextLoader("data/myinfo.txt")
    index = VectorstoreIndexCreator(vectorstore_kwargs={"persist_directory": "/tmp/persist"}).from_loaders([loader])
    print("index created")
    upload_files_to_s3()
    print('Uploaded vector store in S3')
    print("Vector Store initalization complete")
    return index

def reuse_vector_store():
    print("Reusing index...\n")
    download_directory_from_s3()
    vectorstore = Chroma(persist_directory="/tmp/persist", embedding_function=openai_embeddings)
    index = VectorStoreIndexWrapper(vectorstore=vectorstore)
    print("Recreated index")
    return index


index = None
if vector_store_exists:
    index = reuse_vector_store()
else:
    index = intialize_vector_store()
print('Creating chain...')
chain = ConversationalRetrievalChain.from_llm(llm=ChatOpenAI(model="gpt-3.5-turbo", temperature=0),retriever=index.vectorstore.as_retriever(search_kwargs={"k": 1}),)
print("Initialization complete")


def process_chat(chat_input, chat_history_list):
    print(f'Processing {chat_input}, history {chat_history_list}')
    chat_history = []
    for ch in chat_history_list:
        print(ch)
        chat_history.append((ch.get("input"),ch.get("output")))
    output_message = ""
    if debug_mode == False:
        result = chain({"question": chat_input, "chat_history": chat_history})
        print(result)
        output_message = result['answer']
    else:
        output_message = "Response : "+chat_input
    chat_output = {
        "id": str(uuid.uuid4()),
        "isUserInput": False,
        "messageText": output_message,
        "messageSentOn": time.time_ns()
    }
    print(f'Output {chat_output}')
    return chat_output

def handler(event, context):
    print("Lambda handler start")
    print(event)
    response  = None

    if event != None:
        http = event.get("requestContext").get("http")
        if http.get("method") == 'POST' and http.get("path") == '/chat':
            body = json.loads(event.get("body"))
            response  = process_chat(body["messageText"], body["history"])
        elif http.get("method") == 'GET' and http.get("path") == '/init':
            intialize_vector_store()
            response = {"messageText" : "Vector initialized"}
        else:
            response = {"messageText" : "Invald request", "event":event}
    return response