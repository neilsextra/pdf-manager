from flask import Flask, Blueprint, render_template, request, send_file, Response
from flask_npm import Npm
import io
from os import environ
import datetime
import string
import json
import sys
import os
import requests
import time
import re
import operator
import numpy as np
from requests import get, post
from pathlib import Path

import ibm_boto3
from ibm_botocore.client import Config, ClientError

from PyPDF2 import PdfFileReader, PdfFileWriter

from datetime import datetime, timedelta

views = Blueprint('views', __name__, template_folder='templates')

app = Flask(__name__)

Npm(app)

app.register_blueprint(views)

def log(f, message):
    f.write("%s : %s\n" % (str(datetime.now()), message))
    f.flush()


def get_configuration():
    debug_file = "debug.log"
    max_tries = "15"    
    wait_sec = "5"
    max_wait_sec = "60"
    terms = {}

    try:
        import configuration as config
        
        debug_file = config.DEBUG_FILE
        max_tries = config.MAX_TRIES
        wait_sec = config.WAIT_SEC
        max_wait_sec = config.MAX_WAIT_SEC
        terms = config.TERMS
    except ImportError:
        pass

    debug_file = environ.get('DEBUG_FILE', debug_file)
    max_tries = environ.get('MAX_TRIES', max_tries)
    wait_sec = environ.get('WAIT_SEC', max_tries)
    max_wait_sec = environ.get('WAIT_SEC', max_wait_sec)
    terms = environ.get('TERMS', terms)

    return {
        'debug_file': debug_file,
        'max_tries': max_tries,
        'wait_sec': wait_sec,
        'max_wait_sec': max_wait_sec,
        'terms': terms
    }

@ app.route("/query", methods=["GET"])
def query():
    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')

    output = {}

    end_point = request.values.get('endpoint')
    key_id = request.values.get('keyid')
    instance_crn = request.values.get('instancecrn')

    log(f, "[QUERY] commenced  - '%s' - '%s' - '%s' " % (end_point, key_id, instance_crn))

    output['paths'] = []

    f.close()

    return json.dumps(output, sort_keys=True), 200  


@app.route("/upload", methods=["POST"])
def upload():
    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')
    
    cloud_account = request.values.get('cloud_account')
    cloud_token = request.values.get('cloud_token')
    cloud_container = request.values.get('cloud_container')
    cloud_directory = request.values.get('cloud_directory')
    file_size = int(request.values.get('file_size'))

    log(f, '[UPLOAD] commenced uploading - %s:%s:%s - %d' %(cloud_account, cloud_container, cloud_directory, file_size))

    output = []

    try:
        log(f, '[UPLOAD] Read File Content')

        uploaded_files = request.files

        log(f, '[UPLOAD] Files %d' % (len(uploaded_files)))

        files = []

        for uploaded_file in uploaded_files:
            fileContent = request.files.get(uploaded_file)

            file_system_client = get_file_system_client(cloud_account, cloud_token, cloud_container)
 
            write_data_to_file(file_system_client, cloud_directory, uploaded_file, fileContent, file_size)

            log(f, "[UPLOAD] Uploaded  file '%s'" % uploaded_file)


        output.append({
            "filenames": files,
            "status": "OK"
        })

        log(f, '[UPLOAD] Completed Upload')

        f.close()

        return json.dumps(output, sort_keys=True), 200

    except Exception as e:

        print(str(e))

        log(f, str(e))
        f.close()

        output.append({
            "status": 'fail',
            "error": str(e)
        })

        return json.dumps(output, sort_keys=True), 500

@app.route("/retrieve", methods=["GET"])
def retrieve():
    account = request.values.get('account')
    token = request.values.get('token')
    container = request.values.get('container')
    directory = request.values.get('directory')
    filename = request.values.get('filename')

    download_stream = None

    return Response(io.BytesIO(download_stream.readall()), mimetype='application/pdf')



    for training_document in training_documents:
        log(f, '[TRAIN] trained %s' % training_document['documentName'])
        file_client = directory_client.get_file_client(training_document['documentName'])
        file_client.set_metadata({'modelId': modelId,
                                  'forms_recognizer_url' : form_url,
                                  'apim_key' : apim_key,
                                  'pages': str(training_document['pages'])})

    log(f, '[TRAIN] training finished')
    f.close()
  
    output = {
        'ModelId' : modelId
    }
 
    return json.dumps(output, sort_keys=True), 200


@app.route("/")
def start():
    return render_template("main.html")


if __name__ == "__main__":
    PORT = int(environ.get('PORT', '8080'))
    app.run(host='0.0.0.0', port=PORT)