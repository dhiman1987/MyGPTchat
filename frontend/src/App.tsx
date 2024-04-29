import {useEffect, useState, useRef, createRef} from 'react'
import './App.css'
import Loader from './Loader/Loader'
import axios from 'axios'
import {v4 as uuidv4} from 'uuid';
import Markdown from 'react-markdown'
import mascot from './assets/mascot.png'
import openaiIcon from './assets/openai-icon.svg'
import reactIcon from './assets/reactjs-icon.svg'
import springIcon from './assets/spring-icon.svg'

//const apiBaseUrl = "http://localhost:8080"
//const apiBaseUrl = "http://127.0.0.1:5000";
//const apiBaseUrl = "https://fhuzbqxjca.execute-api.ap-south-1.amazonaws.com";
const apiBaseUrl = "https://spotty-plantation-production.up.railway.app";
const queryLimit = 3;
const debugMode = false;
interface Message {
    id: string,
    isUserInput: boolean,
    messageText: string,
    messageSentOn: number
}

interface HistoryItem {
    input: String,
    output: String
}

interface ChatInput {
    messageText: String,
    history: HistoryItem[]

}

const App = () => {
    const defaultMessage: Message = {
        id: "",
        messageText: "Hi 👋 I am **Bol2** 🤖!"+
        "\n\n I can answer questions about 🤓 Dhiman. Why don't you start with"+
        "\n- Who is Dhiman?"+
        "\n- Which companies has he worked for?"+
        "\n- List his software skills in bullet points"+
        "\n- How can I contact him?"+
        "\n\n You can also make questions more detailed. More detail, better the answer.",

        isUserInput: false,
        messageSentOn: Date.now()
    }
    let messagesArr: Message[] = [];
    let historyArr: HistoryItem[] = [];

    const [messages, setMessages] = useState < Message[] > (messagesArr);
    const [history, setHistory] = useState < HistoryItem[] > (historyArr);
    const [newMessageText, setNewMessageText] = useState('');
    const [chatQuery, setChatQuery] = useState('');
    const [startTime, setStartTime] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    let myRef = useRef < null | HTMLDivElement > (null);
    myRef = createRef();

    useEffect(() => {
        console.debug("User effect called...["+chatQuery+"]");
        if (chatQuery != '' && chatQuery!='\n') {
            getChatResponse();
        } 
    }, [chatQuery]);

    useEffect(() => {
        if (messages.length > 3) {
            console.debug("Scrolling...");
            myRef.current ?. scrollIntoView(true);
        }
    }, [messages]);

    if (messages.length == 0) {
        messagesArr.push(defaultMessage);
    }

    const sendMessage = () => {
        const id = uuidv4();
        if (isQueryRateInLimit()) {
            const newMessaage: Message = {
                id: id,
                isUserInput: true,
                messageText: newMessageText,
                messageSentOn: Date.now()
            };
            messagesArr.push(newMessaage);
            setMessages([
                ...messages,
                ... messagesArr
            ]);
            setChatQuery(newMessageText);
            setNewMessageText("");
        } else {

            const newMessaage: Message = {
                id: id,
                isUserInput: false,
                messageText: "🥺 Sorry Limit Exceed!. You are allowed to send 3 queries per minute.",
                messageSentOn: Date.now()
            };
            messagesArr.push(newMessaage);
            setMessages([
                ...messages,
                ... messagesArr
            ]);
        }
    }

    const getChatResponse = async () => {
        setLoading(true);
        let messageResponse: Message = {
            id: uuidv4(),
            isUserInput: false,
            messageText: "",
            messageSentOn: Date.now()
        };
        const chatInput: ChatInput = {
            messageText: chatQuery,
            history: history
        };
        console.debug(chatInput);
        if (! debugMode) {
            try {
                const data: any = await axios.post(apiBaseUrl + "/chat", chatInput);
                messageResponse = data.data;
                console.log(messageResponse);
            } catch (error:any) {
                console.error(error);
                if(error.response || 503 == error.response.status){
                    console.debug(error.response.status);
                    console.debug("http Status: "+error.response.status+"Probably it is a clod start. Need to wait and retry");
                    messageResponse.messageText = "Ohh It is a cold 🥶 start! "+
                    "\n Sorry I could not get response on time." + 
                    "\n This happens sometime as I run on 🤑 free 🤑 tire services" +
                    "\n Please take a deep breath 😌 😌 and try agin in a minute";
                } else {
                    messageResponse.messageText = "🥺 Sorry. I could not get the response. Please try again.";
                }
                
            }
        } else {
            await delay(3000);
            messageResponse.messageText ="Ohh It is a cold 🥶 start! "+
            "\n Sorry!! I could not get response on time." + 
            "\n This happens sometime as I run on 🤑 free 🤑 tire services." +
            "\n Please take a deep breath 😌 😌 and try agin in a minute.";
        }
        const historyItem: HistoryItem = {
            input: chatQuery,
            output: messageResponse.messageText
        }
        historyArr.push(historyItem);
        setHistory([
            ...history,
            ... historyArr
        ]);
        messagesArr.push(messageResponse);
        setMessages([
            ...messages,
            ... messagesArr
        ]);
        setLoading(false);
    }

    const resetChat = () => {
        messagesArr = [];
        messagesArr.push(defaultMessage);
        setMessages(messagesArr);
        historyArr = [];
        setChatQuery('');
    }

    const isQueryRateInLimit = () => {
        const currentTime = Date.now();
        const questionAsked = messages.filter(m => m.isUserInput && m.messageSentOn > startTime).length;
        const durationInSecond = Math.ceil((currentTime - startTime) / 1000);
        console.log(" startTime=", startTime, " currentTime=", currentTime, " duration(second)=", durationInSecond, " questionAsked=", questionAsked);
        if (durationInSecond > 60) { // resetting timer
            setStartTime(Date.now());
            console.log("Reseting start time");
            return true;
        }
        if (questionAsked > queryLimit) {
            console.log("Query limit exceeded. Wait for sometime.");
            return false;
        }
        console.log("Query limit in range.");
        return true;
    }

    const delay = (ms : number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return (
        <>

            <img src={mascot} className='mascot'></img>
                    
            <div className="iconBar">
            <img src={openaiIcon} className="topIcon"></img>
            <img src={springIcon} className="topIcon"></img>
            <img src={reactIcon} className="topIcon"></img>
            </div>
            
            <div></div>
            <div className="chatWidget">
                <div className="messageArea">
                    {
                    messages.map(m => {
                    if (m.isUserInput) {
                        return <div className="yourMessageBox"
                           key={m.id + ""}><Markdown>{m.messageText}</Markdown></div>
                    } else {
                        return <div className="messageBox"
                           key={m.id + ""}><Markdown>{m.messageText}</Markdown></div>
                }

            })
                }
                    <div ref={myRef}></div>
                </div>

                {(!loading && <div className="chatInput">
                <div className='chatInputArea'>
                        <textarea className="chatInputText" placeholder="Ask a question about me..."
                            value={newMessageText}
                            onChange={
                                event => setNewMessageText(event.target.value)
                            }
                            onKeyDown={
                                event => (!loading && event.key === 'Enter' && !event.shiftKey) ? sendMessage() : ''
                        }></textarea>
                    </div>
                    <div className='buttonGroup'>
                        <button className="secondaryButton" type="button"
                            onClick={resetChat}>Reset</button>
                        <button className="mainButton" type="button"
                            onClick={sendMessage}>Ask</button>
                    </div>
                </div>)} 
                {(loading && <Loader></Loader>)}
            </div>
        </>
    )
}

export default App
