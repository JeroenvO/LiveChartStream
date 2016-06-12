
__author__ = 'Jeroen van Oorschot'
# Jeroen van Oorschot 2016
# Stream graphdata to websocket client using autobanh
# client uses smoothie js chart


import time
#import datetime
import sys

import serial

import json

from twisted.internet import reactor, ssl
from twisted.python import log
from twisted.web.server import Site
from twisted.web.static import File

from autobahn.twisted.websocket import WebSocketServerFactory, \
    WebSocketServerProtocol, \
    listenWS

client = ''
serialPort = ''
#import asyncio
#from autobahn.asyncio.websocket import WebSocketServerProtocol

#CHANNEL_SENSOR_DATA = 'queue_BBB_server'

def is_json(jsonstring):
    try:
        json_object = json.loads(jsonstring)
    except ValueError:
        return False
    return True

def main():
    #log.startLogging(sys.stdout)
    connectSerial();

    #contextFactory = ssl.DefaultOpenSSLContextFactory('keys/server.key', 'keys/server.crt')

    factory = WebSocketServerFactory(u"ws://127.0.0.1:9000")

    factory.protocol = graphServerProtocol
    #listenWS(factory, contextFactory)
    reactor.listenTCP(9000, factory)
    #webdir = File(".")
    #webdir.contentTypes['.crt'] = 'application/x-x509-ca-cert'
    #web = Site(webdir)
    #reactor.listenSSL(8080, web, contextFactory)
    #reactor.listenTCP(8080, web)

    reactor.run()
    print("hoi")

def connectSerial():
    # Connect to TelosB via serial over USB
    # Use custom port if given, otherwise default beaglebone usb.
    if len(sys.argv) == 2:
        serialPortName = sys.argv[1]
    else:
        serialPortName = "/dev/ttyUSB0"
    global serialPort
    try:
        serialPort = serial.Serial(
            port=serialPortName,\
            baudrate=115200,\
            parity=serial.PARITY_NONE,\
            stopbits=serial.STOPBITS_ONE,\
            bytesize=serial.EIGHTBITS,\
            timeout=0.010)
        print('Connected to: ' + serialPort.portstr)
    except:
        print("Serial port connection failed")
        quit()



def readSerialData():
    global serialPort
    try:
        serialData = serialPort.readline()
        timestamp = str(time.time())
    except:
        print("serial lost, reconnecting...")
        connectSerial()
        readSerialData()
        return;

    # Read serial from USB continuously
    while (serialData):
        print('[R]@'+timestamp+' ' + serialData)
        # Replace the first index of the json (a '0') by the timestamp
        serialData = '['+timestamp+''+serialData[2:]

        # JSON valid check
        if is_json(serialData):
            sendSerialData(serialData)
        else:
            error = "[E]invJSON: "+serialData
            print(error)

        # Read new data from TelosB
        serialData = serialPort.readline()
        # Use seconds since epoch as timestamp (float)
        timestamp = str(time.time())
    global client
    client.factory.reactor.callLater(0.1, readSerialData)

def sendSerialData(serialData):
    global client
    client.sendMessage(serialData,0)

# websocket stuff

class graphServerProtocol(WebSocketServerProtocol):
    def onConnect(self, request):
        global client
        client = self
        print("Client connecting: {}".format(request.peer))
    def onOpen(self):
        print("WebSocket connection open.")
        readSerialData();
    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {}".format(reason))
    def onMessage(self, payload, isBinary):
      ## echo back message verbatim
        if isBinary == False:
            payload = payload.decode('utf8')
        else:
            print("error, payload is binary\n")
        print("WS message received: "+payload)
#      self.sendMessage(payload, isBinary)

main()
