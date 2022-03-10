import React from "react";

import "../App.css";
import Button from "@mui/material/Button";
import vttToDraft from "../import-adapter/vtt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getToken, isAuth, setTaskId } from "../user/User";
import { Redirect } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import GetVttFromId from "../api/GetVttFromId";
import toast, { Toaster } from "react-hot-toast";
import * as qs from "query-string";
import GetVttCorrectionFromId from "../api/GetVttCorrectionFromId";

class ToolPage extends React.Component {
  SERVER_URL = "";

  constructor(props) {
    super(props);

    this.state = {
      transcriptData: null,
      mediaUrl: null,
      id: null,
      taskId: "",
      fileName: "",
    };
  }

  // https://stackoverflow.com/questions/8885701/play-local-hard-drive-video-file-with-html5-video-tag
  handleLoadMedia = (files) => {
    const file = files[0];
    const videoNode = document.createElement("video");
    const canPlay = videoNode.canPlayType(file.type);

    if (canPlay) {
      const fileURL = URL.createObjectURL(file);
      this.setState({
        // transcriptData: DEMO_TRANSCRIPT,
        mediaUrl: fileURL,
        fileName: file.name,
      });
    } else {
      alert("Select a valid audio or video file.");
    }
  };

  handleLoadMediaUrl = () => {
    const fileURL = prompt("Paste the URL you'd like to use here:");

    this.setState({
      mediaUrl: fileURL,
    });
  };

  handleLoadTranscriptJson = (files) => {
    const file = files[0];
    // console.log(file);
    // console.log('read ' + file.type);
    this.setState({ exportName: file.name.split(".")[0] });

    const fileReader = new FileReader();
    fileReader.fileName = file.name;
    fileReader.onload = (event) => {
      const data = vttToDraft(event.target.result);

      setTaskId(data[1]);
      this.setState({
        transcriptData: data[0],
        id: "task_id:" + data[1],
        fileName: event.target.fileName,
      });
    };
    fileReader.readAsText(file);
  };

  handleLoadTranscriptFromServer = (text) => {
    // console.log(file);
    // console.log('read ' + file.type);
    this.setState({ exportName: this.state.taskId });
    const data = vttToDraft(text);
    setTaskId(this.state.taskId);
    this.setState({
      transcriptData: data[0],
      id: "task_id:" + data[1],
      fileName: "",
    });
  };

  uploadTranscript = (vttBody) => {
    let pre = `WEBVTT\n\nNOTE ${this.state.id}\n\n`;
    const vttComplete = pre + vttBody;
    let data = new FormData();
    data.append("cfile", new Blob([vttComplete], { type: "text/vtt" }));

    fetch(`${this.SERVER_URL}/tasks/api/return/`, {
      method: "POST",
      body: data,
    })
      .then((response) => {
        if (response.status == 200) {
          alert("Successfully sumbitted!");
        } else {
          alert("ERROR. Could not submit.");
        }
      })
      .catch((error) => {
        console.log("error:");
        console.log(error);
        alert("ERROR. Server error.");
      });
  };

  /*checkTranscriptId = () => {
    if (this.state.transcriptData && !this.state.id) {
      alert("Transcript id missing in VTT. Please use another transcript");
    }
  };*/

  async getVttFromId() {
    let token = getToken();
    let text = await GetVttCorrectionFromId(this.state.taskId);
    if (text) {
      if (!window.confirm("Load your last uploaded correction?")) {
        text = await GetVttFromId(token, this.state.taskId);
      }
    }
    else{
      text = await GetVttFromId(token, this.state.taskId);
    }
    if (text) this.handleLoadTranscriptFromServer(text);
    else
      toast.error("Failed to load the file, please check your task id", {
        position: "bottom-center",
      });
  }

  componentDidUpdate(prevProps, prevState) {
    /*if (prevState.transcriptData !== this.state.transcriptData) {
      this.checkTranscriptId();
    }*/
  }

  componentDidMount() {
    let parsed = qs.parse(window.location.href.toString().split("/?")[1]);
    if (parsed.task_id && parsed.task_id != "") {
      this.state = {
        transcriptData: null,
        mediaUrl: null,
        id: null,
        taskId: parsed.task_id,
        fileName: "",
      };
      this.getVttFromId();
    }
  }
  render() {
    if (isAuth()) {
      return (
        <div className="App">
          <header className="App-header">
            <LogoutButton></LogoutButton>
            {/* <Button onClick={ () => this.handleLoadMediaUrl()} variant="contained">Load Media URL</Button> */}

            <h1 style={{ color: "#ffffff", fontSize: 75 }}>
              Transcription Corrector
            </h1>

            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                width: "30%",
                padding: 20,
              }}
            >
              <p style={{ color: "#ffffff", fontSize: 10 }}>
                <Button
                  variant="contained"
                  component="label"
                  style={{ margin: "10px", marginRight: "0" }}
                >
                  Load Media File
                  <input
                    hidden
                    type={"file"}
                    id={"mediaFile"}
                    onChange={(e) => this.handleLoadMedia(e.target.files)}
                  />
                  {this.state.mediaUrl && (
                    <CheckCircleIcon style={{ marginLeft: "10px" }} />
                  )}
                </Button>
              </p>
            </div>

            <div style={{ height: 15 }}></div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                width: "30%",
                padding: 20,
              }}
            >
              {/*<div
                style={{
                  display: "flex",
                  flexDirection: "row",
                 
                }}
              >
                <input
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    width: "100%",
                    height: 30,
                    marginTop: 10,
                    borderRadius: 7,
                    color: "#000000",
                    borderWidth: 0,
                    alignSelf: "center",
                    fontWeight:'bold',
                    borderWidth:2
                  }}
                  onChange={(e) => {
                    this.setState({ taskId: e.target.value });
                  }}
                  placeholder=" Enter the task id"
                ></input>
                <button
                  onClick={() => this.getVttFromId()}
                  style={{ alignSelf: "center", marginLeft: 10 ,backgroundColor:"#1976D2",borderColor:"#1976D2",borderRadius:3,marginTop:10,color:"white",padding:3}}
                >
                  Submit
                </button>
              </div>
              <p style={{fontSize:25}}>OR</p>*/}
              <Button
                variant="contained"
                component="label"
                style={{ margin: "10px", fontSize: 13 }}
              >
                Load Transcript (vtt)
                <input
                  hidden
                  type={"file"}
                  id={"transcriptFile"}
                  onChange={(e) =>
                    this.handleLoadTranscriptJson(e.target.files)
                  }
                />
                {this.state.transcriptData && this.state.id && (
                  <CheckCircleIcon style={{ marginLeft: "10px" }} />
                )}
              </Button>
            </div>

            {this.state.transcriptData && this.state.mediaUrl && (
              <Redirect
                to={{
                  pathname: "editor",
                  state: {
                    fileName: this.state.fileName,
                    transcriptData: this.state.transcriptData,
                    mediaUrl: this.state.mediaUrl,
                    id: this.state.id,
                    exportName: this.state.exportName,
                    uploadTranscript: this.state.uploadTranscript,
                  },
                }}
              ></Redirect>
            )}

            <img
              src={require("../images/background.png").default}
              style={{
                bottom: "0%",
                backgroundColor: "rgba(0,0,0,0)",
                width: "100%",
                position: "absolute",
              }}
            ></img>
            <Toaster></Toaster>
          </header>
        </div>
      );
    } else {
      return <Redirect to="login"></Redirect>;
    }
  }
}

export default ToolPage;
