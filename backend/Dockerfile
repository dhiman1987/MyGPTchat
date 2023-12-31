# Define custom function directory
ARG FUNCTION_DIR="/function"

FROM python:3 as build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Copy function code
RUN mkdir -p ${FUNCTION_DIR}
RUN mkdir -p ${FUNCTION_DIR}/data
COPY ./requirements.txt requirements.txt
COPY ./lambda_function.py ${FUNCTION_DIR}/lambda_function.py
COPY ./data/myinfo.txt  ${FUNCTION_DIR}/data/myinfo.txt

# Install the function's dependencies
RUN pip install -r requirements.txt --target ${FUNCTION_DIR}

# Use a slim version of the base Python image to reduce the final image size
FROM python:3-slim

# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

# Copy in the built dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Set runtime interface client as default command for the container runtime
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]
# Pass the name of the function handler as an argument to the runtime
CMD [ "lambda_function.handler" ]