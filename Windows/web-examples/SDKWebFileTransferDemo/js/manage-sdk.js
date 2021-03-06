var sdk; //activex component
var id = "demo_sdk_user"; //trueconf id
var password = "123456"; //trueconf password
var server = "";
var isLogin = false; //login flag
var inConference = false; //busy flag
var type = 0; //state : 
							//	0 - not in call or conference
							//	1 - in peer-to-peer call
							//	2 - in conference

function connectToAXEvent(o, etype, func) //func for add eventListener to activex component
{
  if (o.attachEvent) {
    o.attachEvent(etype, func);
  } else {
    var id = o.id, f = func;
    eval('(function(){' +
      'function ' + id + '::' + etype + '(){' +
      'f.apply(f,arguments);' +
      '}' +
      '})();');
  }
}

window.onbeforeunload = function(){
	sdk.shutdown(); //close sdk component when windows close or reload
}

var updateListOfReceivedFiles = function (e) {
	$("#listOfReceivedFiles").html(""); //clear list of received files
	var data = JSON.parse(sdk.XGetFileTransferList()); //get and parse Json data about received files
	for(var i = 0; i < data.files.length; i++) { 
		var element = data.files[i]; //get every file in list
		$("#listOfReceivedFiles").append("<tr><td>" + element.fileName + "</td><td>" + element.peerId + "</td><td><a href='file:///" + element.downloadDir + "'>Open file in explorer</a></td></tr>"); //and add file to list of received files
	}
};

function start() { //body onload listener

	isLogin = false;
	isStart = false;
	$("#status").html("Starting..."); //show status
    
	sdk = document.getElementById("activex"); //get activex component
		
		$("#submitLogin").click(function(e) { //handle Login button click
			server = $("#inputServer").val(); //get entered server
			id = $("#inputId").val(); //get entered TrueConf Id
			password = $("#inputPassword").val(); //get entered password
			sdk.connectToServer(server); //connect to entered server
			$("#loginPage").click(); //close login form
		});			
		$("#updateList").click(updateListOfReceivedFiles); //handle update list of received files button
		$("#sendFile").click(function(e) { //handle Send file button
			if ($("#selectFile").val() == "") { //if file is not selected
				$("#status").html("File is not selected!"); //show status
			} else {
				var fileName = $("#selectFile").val(); //get name of selected file
				$("#status").html("File is selected!"); //show status
				if(type == 2) { //if user is in conference now
					sdk.XFileSendToConference(fileName, "*/*"); //send selected file to conference
					$("#status").html("File is sended to conference!"); //show status
				} 
				if((type == 0 || type == 1) && $("#user_id").val() != "") { //if user is not in conference and user id is entered
					sdk.XFileSend($("#user_id").val(), fileName, "*/*"); //send selected file to user id
					$("#status").html("File is sended to user " + $("#user_id").val() + "!"); //show status
				}
				else {
					$("#status").html("User id is empty! Enter user id for send file.")
				}
			}          
		});
			
    connectToAXEvent(sdk, 'OnXAfterStart', function (e) { //add handling for OnXAfterStart event
      isStart = true;
      sdk.XSetCameraByIndex(0); //select camera
      sdk.XSelectMicByIndex(0); //select microphone
      sdk.XSelectSpeakerByIndex(0); //select speakers
      sdk.connectToServer(""); //connect to the server/service
	  	$("#status").html("Connecting..."); //show status
		});

    connectToAXEvent(sdk, 'OnServerConnected', function (e) { //add handling for OnServerConnected event
			$("#status").html("You successfully logged in on server " + server + "!");
			sdk.login(id, password); //login
    });

    connectToAXEvent(sdk, 'OnXError', function (e) { //add handling for OnXError event
      isLogin = false;
      $("#status").html("Error logged in on server!"); //show status
    });

    connectToAXEvent(sdk, 'OnXLogin', function (e) { //add handling for OnXLogin event
      isLogin = true;
			$("#status").html("You successfully logged in as " + id + "!"); //show status						
    });
    connectToAXEvent(sdk, 'OnXLoginError', function (e) { //add handling for OnXLoginError event
      isLogin = false;
      $("#status").html("Error logged in on server!"); //show status
    });
    connectToAXEvent(sdk, 'OnConferenceCreated', function (e) { //add handling for OnConferenceCreated event
      inConference = true; // call or conference started
			$("#status").html("Call or conference started!"); //show status
			var data = JSON.parse(e); //parse Json info about call or conference
			if(e.confType == 0) { //if (type = call) set that user is in peer-to-peer call now
				type = 1;
			} else { //else setting that user is in conference now
				type = 2;
			}
    });
    connectToAXEvent(sdk, 'OnConferenceDeleted', function (e) { //add handling for OnConferenceDeleted event
      inConference = false; //call or conference ended
			$("#status").html("Call or conference ended!"); //show status
			type = 0; //setting that user is not in conference now
    });  
    connectToAXEvent(sdk, 'OnInviteReceived', function (e) { //add handling for OnInviteReceived event      
      var data = JSON.parse(e); //get information about incoming call from JSON data
			var message = "";
			switch(data.type)
			{
					case 0: //type 0 - incoming peer-to-peer call
							message = "Do you want accept call from ";
							break;
					case 1: //type 1 - incoming invitation to conference
							message = "Do you want accept invite to conference from ";
							break;
			}
			if (confirm(message + data.peerId + "?") == true) { //ask user about incoming call or invitation
					sdk.accept(); //if user says "Yes" accept incoming call or invitation
			}	else {
					sdk.reject(); //else reject incoming call or invitation
			}
		});	
		connectToAXEvent(sdk, 'OnXFileReceive', function (e) { //add handling for OnXFileReceive event      
      updateListOfReceivedFiles(); //update list of received files to show new file
		});
		connectToAXEvent(sdk, 'OnXFileRequestReceived', function (e) { //add handling for OnXFileRequestReceived event
			if (confirm("Do you want accept incoming file?") == true) { //ask user about incoming file
				sdk.XFileAccept(e.fileId); //if user says "Yes" accept incoming file
			} else {
				sdk.XFileReject(e.fileId); //else reject incoming file
			}
			updateListOfReceivedFiles(); //and update list of received files to show new file
		});
		connectToAXEvent(sdk, 'OnXNotify', function (e) { //add handling for OnXNotify event      
			if(isLogin) {
				if($("#listOfReceivedFiles").html().indexOf("Open file", 0) == -1)
					updateListOfReceivedFiles();
			}
		});
	connectToAXEvent(sdk, 'OnRejectReceived', function (e) { //add handling for OnRejectReceived event  
		var msg = JSON.parse(e);
		switch(msg.cause) { //show status
			case 0:
			$("#status").html("Call rejected by participant");
			break;
			case 1:
			$("#status").html("Conference is busy");
			break;
			case 2:
			$("#status").html("Participant is busy");
			break;
			case 3:
			$("#status").html("Participant not available now");
			break;
			case 4:
			$("#status").html("Invalid conference");
			break;
			case 5:
			$("#status").html("Invalid participant");
			break;
			case 6:
			$("#status").html("Join ok");
			break;
			case 7:
			$("#status").html("Reach money limit");
			break;
			case 8:
			$("#status").html("Call rejected by access denied");
			break;
			case 9:
			$("#status").html("Call rejected by logout");
			break;
			case 10:
			$("#status").html("Call rejected by resource limit");
			break;
			case 11:
			$("#status").html("Call rejected by local resource");
			break;
			case 12:
			$("#status").html("Conference password required");
			break;
			case 13:
			$("#status").html("Call rejected by wrong password");
			break;
			case 14:
			$("#status").html("Call rejected because user is not in your Address book");
			break;
			case 15:
			$("#status").html("Call rejected by bad rating");
			break;
			case 16:
			$("#status").html("Call rejected by timeout");
			break;
			case 17:
			$("#status").html("This is conference");
		}
    });    
  }