//Jeroen van Oorschot 2016
//Plots data on graph.pontus.ele.tue.nl
//Javascript functions for receiving data via Autobahn from pontus.ele.tue.nl
//and putting this data to the plots of plotter.js
var socket = null;
var isopen = false;
window.onload = function() {
   socket = new WebSocket("wss://...:5000");
   socket.binaryType = "arraybuffer";
   socket.onopen = function() {
      console.log("Connected!");
      isopen = true;
   }
   socket.onmessage = function(e) {
      if (typeof e.data == "string") {
         try{
           obj=JSON.parse(e.data)
         }catch(err){
           alert("JSON not decoded: "+err)
         }
         parseData(obj);
      } else {
        console.log("binary message received, not decoded");
      }
   }
   socket.onclose = function(e) {
      console.log("Connection closed.");
      socket = null;
      isopen = false;
   }
};
function sendText(txt) {
   if (isopen) {
      socket.send(txt);
      console.log("Sended: "+txt);
   } else {
      console.log("Connection not open, not sended.")
   }
};

/* From here on the graph scripts */
function parseData(obj){
  //log everything for debugging
  console.log(obj);
  if(obj[4]==undefined)
  	return;

  var bbbid = obj[1];
  var type = obj[3];

  var b = obj[4];
 // console.log(b);
  var validValues = Object.keys(b);
//Format: [1460457932.01,10,9,"N",{"prr":0,"rssi":-66,"lqi:":107,"latency":0}]
//check for each line of each chart whether the current message can be plotted in that line.
if(graphList){
	for(i=0;i<graphList.length;i++){ //each graph
	//console.log(i);
		var thisGraph = graphList[i];
		for(j=0;j<thisGraph.numSeries;j++){ //each timeseries (line)
			//console.log(j);
			var thisTimeSeries = thisGraph.timeSeriesContainerList[j]; //each timeseries of this graph
			//check if this timeseries belongs to this message-obj, and whether its value is in the obj
			if(thisTimeSeries.bbbid==bbbid && thisTimeSeries.type==type && validValues.indexOf(thisTimeSeries.value)> -1){
				//console.log(obj);
				thisTimeSeries.addDataPoint(obj[0]*1000,obj[4][thisTimeSeries.value]);
			}else{
        //this message (obj) does not contain data for this specific timeseries
				//console.log('no valid entry for: '+obj);
			}
		}
	}
}
	//show all R and T types in the log block in the bottom.
  if(obj[3]=='R' || obj[3]=='T'){
    //format: [0,9,"T",{"dest":90,"pwr":31,"channel":26,"data":"Bericht"}]
    var timestamp = obj[0];
    var h = Math.floor(timestamp/60/60);
    var m = Math.floor((timestamp - h * 60 * 60) / 60);
    var s = Math.floor((timestamp - h *60 *60 - m*60))
    var ms = ((timestamp - Math.floor(timestamp))*100).toFixed(0);
    h = h%24;
    ms = (ms < 10) ? ("0" + ms) : ms;
    s = (s < 10) ? ("0" + s) : s;
    m = (m < 10) ? ("0" + m) : m;
    h = (h < 10) ? ("0" + h) : h;
    var sendtime = h+":"+m+":"+s+":"+ms;
    //prepend this message to the messagebox
    if(obj[3]=='R'){
      color = 'red';
    }else if (obj[3]=='T') {
      color='green';
    }
    document.getElementById('logBlock').insertAdjacentHTML('afterbegin', '<span style="color:'+color+'">'+obj[1]+":"+obj[2]+":"+obj[3]+"</span>@"+sendtime+"\t"+JSON.stringify(obj[4],null,2)+'<br />');
  }
}
