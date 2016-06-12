//Jeroen van Oorschot 2016
//Plots data on graph.pontus.ele.tue.nl
//every plot is an object, and every line in the plot is an object.
//each graph has an array of timeseriesContainers that keep each line of the graph
//graphlist is a list of all graph currently visible.
var graphList = [];
var highestID = 0;
var highestNewLineID=0;
//add a row to the form for adding a graph. This way a line can be added to a graph.
function addLineInput(){
	highestNewLineID++;
	var id = highestNewLineID;
	var txt = '<tr class="lineInput" id="lineInput'+id+'"><td><b>Line '+id+'</b></td><td>BBB-ID</td><td><input type="number" class="fieldBBBID" min="0" max="250" required /></td>    <td>Type (T, R, ..)</td><td><input type="text" maxlength="1" size="3" class="fieldType" required /></td><td>Key (rssi, lqi, ..)</td><td><input type="text" class="fieldValue" size="10" required /></td><td>Color</td><td><input type="color" class="fieldColor" value="#ff0000" /></td><td>	<button type="button" class="btn btn-default" aria-label="Left Align" onClick="removeLineInput('+id+')">  <span class="glyphicon glyphicon-minus" aria-hidden="true"></span> Remove TimeSeries (line)</button>	</td></tr>';
	document.getElementById("valueFieldBox").insertAdjacentHTML('beforeend',txt);
}
//remove a line from a graph. Used when clicking the "remove timeseries (line)".
function removeLineInput(id){
	//console.log(id);
	var obj = document.getElementById("lineInput"+id);
	obj.parentElement.removeChild(obj);
}

//add graph from form. including a little bit input sanitation
function addGraph(){
	//graph
	var graphName = document.getElementById("fieldGraphName").value;
	if(!graphName){ //a graph needs a name as title.
		window.alert("please enter graph name");
		return;
	}
	highestID++;
	//a unique ID to identify this graph.
	var uuid = graphName+highestID;
	//list of all properties of the timeseries
	var bbbidList = document.getElementsByClassName("fieldBBBID");
	var typeList = document.getElementsByClassName("fieldType");
	var valuesList = document.getElementsByClassName("fieldValue");
	var colorList = document.getElementsByClassName("fieldColor");
	var numSeries = valuesList.length; //number of lines in the graph.
	var timeSeriesList = new Array();
	//make array of timeseriesContainers from the input values.
	for(i=0;i<numSeries;i++){
		if(bbbidList[i].value && typeList[i].value && colorList[i].value && valuesList[i].value){
			timeSeriesList[i]=new timeSeriesContainer(bbbidList[i].value,typeList[i].value.toUpperCase(),valuesList[i].value,colorList[i].value)
		}else{
			window.alert("Parse error in "+(i+1)+"th time serie");
		}
	}
	//make the graph.
	if(uuid && timeSeriesList.length>0){
		new graph(uuid,graphName,timeSeriesList);
	}else{
		window.alert("Please add a valid time series (line)");
	}
}

//a timeseries within a graph.
function timeSeriesContainer(bbbid,type,value,color){
	this.bbbid = bbbid;
	this.type = type;
	this.value = value;
	this.color = color;
	this.line = null; //this contains the callback for adding points to this line.
}

//add a datapoint to a timeseries
timeSeriesContainer.prototype.addDataPoint = function (time,value){
	//console.log(this);
	this.line.append(time,value);
}

//object for each graph. a graph can have multiple timeSeries (lines)
function graph(canvasID,name,timeSeriesContainerList){
	var legend = "";
	this.canvasID = canvasID;
	this.timeSeriesContainerList = timeSeriesContainerList;
	this.numSeries = timeSeriesContainerList.length;
	//create legend with labels
	for(i=0;i<this.numSeries;i++){
		legend+='<span class="label" style="background-color:'+timeSeriesContainerList[i].color+'!important"> '+
		timeSeriesContainerList[i].bbbid+':'+timeSeriesContainerList[i].type+'.'+timeSeriesContainerList[i].value+' </span>';
	}
//insert heading, legend and canvas
	document.getElementById('graphBox').insertAdjacentHTML('beforeend', '<span id="span'+canvasID+'" style="display:block"><h3 style="display:inline"><br />'+name+' </h3> '+legend+' <button type="button" class="btn btn-default" aria-label="Left Align" onClick="removeGraph(\''+canvasID+'\')">  <span class="glyphicon glyphicon-trash" aria-hidden="true"></span> Remove graph </button></span><canvas id="'+canvasID+'" width="750" height="250"></canvas>');
	this.canvas = document.getElementById(canvasID);

	//make chart
	this.chart = new SmoothieChart({
		millisPerPixel:100,
		grid:{fillStyle:'rgba(0,0,0,0.59)',verticalSections:4},
		timestampFormatter:SmoothieChart.timeFormatter
	});

	//add all lines to the graph.
	for(i=0;i<this.numSeries;i++){
		this.timeSeriesContainerList[i].line = new TimeSeries();
		//console.log(this.timeSeriesList[i]);
		this.chart.addTimeSeries(this.timeSeriesContainerList[i].line,{lineWidth:2,strokeStyle:this.timeSeriesContainerList[i].color});
	}
	//put this graph on the graphlist.
	graphList.push(this);
	//let the chart stream to the canvas
	this.chart.streamTo(this.canvas,500);
}

//function to remove a graph. Called when the "remove graph" button is clicked.
function removeGraph(ID){

	//remove canvas
	var obj = document.getElementById(ID);
	obj.parentElement.removeChild(obj);
	//remove heading
	var obj = document.getElementById("span"+ID);
	obj.parentElement.removeChild(obj);
	//remove object from list
	console.log(graphList);
	for(i=0;i<graphList.length;i++){ //each graph
		if(graphList[i].canvasID == ID){
			graphList.splice(i,1);
			break;
		}
	}
	console.log(graphList);
}
