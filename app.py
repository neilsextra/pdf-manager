from configparser import NoOptionError
from flask import Flask, Blueprint, render_template, request, send_file, Response
from flask_npm import Npm
import io
from os import environ
import datetime
import string
import json
import sys
import os
import time
import re
import operator
import urllib.parse
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
    print("%s : %s\n" % (str(datetime.now()), message))

def get_configuration():
    debug_file = "debug.log"

    try:
        import configuration as config
        
        debug_file = config.DEBUG_FILE

    except ImportError:
        pass

    debug_file = environ.get('DEBUG_FILE', debug_file)

    return {
        'debug_file': debug_file
     }

def analyze_form(f, url, token, data):
    configuration = get_configuration()

    params = {
        "machine_only": True
    }

    headers = {
        # Request headers
        'Authorization': 'Token ' + token
    }

    try:
        resp = post(url=url, data=data, headers=headers, params=params)
  
        print("POST analyze succeeded:\n%s" % resp.headers)
       
        return resp.headers

    except Exception as e:
        print("POST analyze failed:\n%s" % str(e))

    return None


def get_client(f, end_point, key_id, instance_crn):
    client = ibm_boto3.resource("s3",
    ibm_api_key_id=key_id,
    ibm_service_instance_id=instance_crn,
    ibm_auth_endpoint='https://iam.cloud.ibm.com/identity/token',
    config=Config(signature_version="oauth"),
    endpoint_url=end_point)

    return client

def get_buckets(client):
    try:
        buckets = client.buckets.all()
        for bucket in buckets:
            print("Bucket Name: {0}".format(bucket.name))
    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
    except Exception as e:
        print("Unable to retrieve list buckets: {0}".format(e))

def get_bucket_contents(f, client, bucket_name):
    print("Retrieving bucket contents from: {0}".format(bucket_name))
    paths = []
    try:
        files = client.Bucket(bucket_name).objects.all()
        for file in files:
            print("Item: {0} ({1} bytes).".format(file.key, file.size))

            paths.append({
                'name' : file.key,
                'size' : file.size
            })

    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
    except Exception as e:
        print("Unable to retrieve bucket contents: {0}".format(e))

    return paths

def upload_file_contents(f, client, bucket_name, file_name, data):
    bucket = client.Bucket(bucket_name)

    obj = bucket.Object(file_name)
    
    obj.upload_fileobj(data)


@app.route("/query", methods=["GET"])
def query():
    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')

    output = {}

    end_point = urllib.parse.unquote(request.values.get('endpoint'))
    key_id = request.values.get('keyid')
    instance_crn = request.values.get('instancecrn')
    bucket = request.values.get('bucket')

    log(f, "[QUERY] commenced  - '%s' - '%s' - '%s' - '%s'" % (end_point, key_id, instance_crn, bucket))

    client = get_client(f, end_point, key_id, instance_crn)

    paths = get_bucket_contents(f, client, bucket)

    output['paths'] = paths

    f.close()

    return json.dumps(output, sort_keys=True), 200  


@app.route("/upload", methods=["POST"])
def upload():
    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')
    
    end_point = urllib.parse.unquote(request.values.get('endpoint'))
    key_id = request.values.get('keyid')
    instance_crn = request.values.get('instancecrn')
    bucket = request.values.get('bucket')

    log(f, "[UPLOAD] commenced  - '%s' - '%s' - '%s' - '%s'" % (end_point, key_id, instance_crn, bucket))

    output = []

    try:
        log(f, '[UPLOAD] Read File Content')

        uploaded_files = request.files

        log(f, "[UPLOAD] Files count - '%d'" % (len(uploaded_files)))

        files = []

        client = get_client(f, end_point, key_id, instance_crn)

        for uploaded_file in uploaded_files:

            fileContent = request.files.get(uploaded_file)

            upload_file_contents(f, client, bucket, uploaded_file, fileContent)

            files.append(uploaded_file)

            log(f, "[UPLOAD] Uploaded file - '%s'" % uploaded_file)

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

    end_point = urllib.parse.unquote(request.values.get('endpoint'))
    key_id = request.values.get('keyid')
    instance_crn = request.values.get('instancecrn')
    bucket = request.values.get('bucket')
    filename = request.values.get('filename')

    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')
 
    log(f, "[RETRIEVE] commenced  - '%s' - '%s' - '%s' - '%s' - '%s'" % 
            (end_point, key_id, instance_crn, bucket, filename))

    client = get_client(f, end_point, key_id, instance_crn)
    file = client.Object(bucket, filename).get()

    data = file['Body'].read()

    return Response(io.BytesIO(data), mimetype='application/pdf')

@app.route("/analyze", methods=["GET"])
def analyze():

    end_point = urllib.parse.unquote(request.values.get('endpoint'))
    key_id = request.values.get('keyid')
    instance_crn = request.values.get('instancecrn')
    bucket = request.values.get('bucket')
    filename = request.values.get('filename')
    url = request.values.get('url')
    token = request.values.get('token')

    configuration = get_configuration()

    f = open(configuration['debug_file'], 'a')

    log(f, "[ANALYZE] commenced  - '%s' - '%s' - '%s' - '%s' - '%s'" % 
            (end_point, key_id, instance_crn, bucket, filename))

    client = get_client(f, end_point, key_id, instance_crn)
    file = client.Object(bucket, filename).get()

    result = analyze_form(f, url, token, data = file['Body'].read())

    log(f, "[ANALYZE] completed  - '%s' - '%s' - '%s' - '%s' - '%s'" % 
            (end_point, key_id, instance_crn, bucket, filename))

    print(result)

    output = []

    output.append({
            "status": 'ok',
        })

    return json.dumps(output, sort_keys=True), 200

@app.route("/")
def start():
    return render_template("main.html")


if __name__ == "__main__":
    PORT = int(environ.get('PORT', '8080'))
    app.run(host='0.0.0.0', port=PORT)