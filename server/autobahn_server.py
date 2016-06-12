#Jeroen van Oorschot, BEP 2016
#server side python app to stream data to graph.pontus.ele.tue.nl
#gets data from rabbitMQ on the yuri-VM on pontus.ele.tue.nl with IP 192.168.100.12
#rabbitMQ queue "channel_plot6"
#Forwards data to website using Autobahn (a simple websocket framework)

import subprocess
import threading
import time
import sys
from time import sleep
import pika
import json
#for Autobahn:
from twisted.internet import reactor, ssl
from twisted.python import log
from twisted.web.server import Site
from twisted.web.static import File

from twisted.internet.defer import Deferred
connection = []

#for Autobahn
from autobahn.websocket import WebSocketServerFactory, \
    WebSocketServerProtocol, \
    listenWS
#RabbitMQ config
RABBITMQ_SERVER_ADDRESS = ... 
RABBITMQ_SERVER_PORT = 5672
RABBITMQ_USERNAME = ...
RABBITMQ_PASSWORD = ...
CHANNEL_SENSOR_DATA = 'channel_plot6'

#callback for received messages from rabbitmq server
def callback(ch, method, properties, body):
    print("%r" % (body,))
    if is_json(body):
        sendData(body)

#blocking function to connect to rabbitMQ
def connectRabbitMQ():
    credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
    connection = pika.BlockingConnection(
    pika.ConnectionParameters(host=RABBITMQ_SERVER_ADDRESS, port=RABBITMQ_SERVER_PORT, credentials=credentials))
    channel = connection.channel()
    channel.exchange_declare(exchange=CHANNEL_SENSOR_DATA, type='fanout')
    result = channel.queue_declare(exclusive=True)
    queue_name = result.method.queue
    print(queue_name)
    channel.queue_bind(exchange=CHANNEL_SENSOR_DATA, queue=queue_name)
    print("RabbitMQ connected!")
    channel.basic_consume(callback, queue=queue_name, no_ack=True)
    channel.start_consuming()

#check if a string is valid json.
def is_json(jsonstring):
    try:
        json_object = json.loads(jsonstring)
    except ValueError:
        return False
    return True

#send data to all autobahn clients
def sendData(data):
    global connection
    for client in connection:
        if client != '':
            client.sendMessage(data,0)
            print("sending!"+data)
        else:
            print("invalid client!")

#class for each autobahn client, including all callbacks
class graphServerProtocol(WebSocketServerProtocol):
    def onConnect(self, request):
        global connection
        #client = self
        connection.append(self)
        print("Client connecting: {}".format(request.peer))
    def onOpen(self):
        print("WebSocket connection open.")
    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {}".format(reason))
        connection.remove(self)
    def onMessage(self, payload, isBinary):
      ## echo back message verbatim
        if isBinary == False:
            payload = payload.decode('utf8')
        else:
            print("error, payload is binary\n")
        print("WS message received: "+payload)

#helper class to start the autobahn connection
class graphServerClient(graphServerProtocol):
    def __init__(self):
        self.factory=WebSocketServerFactory("...:5000")
        log.startLogging(sys.stdout)
        self.factory.protocol = graphServerProtocol
        reactor.listenTCP(5000, self.factory)
        reactor.run(installSignalHandlers=0)

#thread to connect to all autobahn clients
def autobahnConnection():
    x = graphServerClient()

#thread to connect to rabbitMQ server
def rabbitMQConnection():
    connectRabbitMQ()

t = threading.Thread(target=autobahnConnection)
t.daemon = True
t.start()
u = threading.Thread(target=rabbitMQConnection)
u.daemon = True
u.start()

#send periodic heartbeats to keep the connection alive
while True:
    print(str(connection))
    sendData('["autobahn heartbeat"]')
    sleep(10)
