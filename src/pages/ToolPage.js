import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { Redirect } from "react-router-dom";
import JSZip from "jszip";
import JSZipUtils from "jszip-utils";
import localforage from "localforage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Button from "@mui/material/Button";
import * as qs from "query-string";

import "../App.css";
import vttToDraft from "../import-adapter/vtt";
import { getToken, isAuth, setTaskId } from "../user/User";
import LogoutButton from "../components/LogoutButton";
import GetVttFromId from "../api/GetVttFromId";
import { ONE_FILE_MODE, DEFAULT_MODE, AGREEMENT } from "../constants.js";


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
      mode: "",
      processing: false,
      errorReadingFile: false,
      vttFile: "",
      agreement: false,
    };
  }

  // https://stackoverflow.com/questions/8885701/play-local-hard-drive-video-file-with-html5-video-tag
  handleLoadMedia = (files) => {
    const file = files[0];
    const ext = file.name.split('.').at(-1)

    if (["application/zip", "application/zip-compressed", "application/x-zip-compressed"].includes(file.type)
      || ext === 'zip') {
      const zipName = file.name.split('.').slice(0, -1).join('.');
      this.setState({
        processing: true,
        exportName: zipName,
      });
      const fileURL = URL.createObjectURL(file);
      this.processZip(fileURL, zipName);
    } else {
      this.processMediaFile(file);
    }
  };

  processMediaFile = (file) => {
    const videoNode = document.createElement("video");
    const canPlay = videoNode.canPlayType(file.type);

    if (canPlay) {
      const fileURL = URL.createObjectURL(file);
      this.setState({
        // transcriptData: DEMO_TRANSCRIPT,
        mediaUrl: fileURL,
        fileName: file.name,
        mode: DEFAULT_MODE,
      });
    } else {
      alert("Select a valid audio or video file.");
    }
  }

  processZip = (fileURL, zipName) => {
    let includesWaveFiles = false;
    let includesMediaFile = false;
    let includesTranscriptFile = false;
    let transcriptData, id, fileName, mediaURL, exportName;

    if (["commandclips", "commandclips2"].includes(DEFAULT_MODE)) {
      localforage.getItem("title").then((titleInMemory) => {
        if (titleInMemory !== zipName) {
          localforage.clear();
          localforage.setItem("title", zipName);
        }
      });
    } else if (DEFAULT_MODE === 'commandclipsCheck') {
      localforage.getItem("title_check").then((titleCheckInMemory) => {
        if (titleCheckInMemory !== zipName) {
          localforage.clear();
          localforage.setItem("title_check", zipName);
        }
      });
    } else {
      localforage.clear();
    }

    JSZipUtils.getBinaryContent(fileURL, async (err, data) => {
      const zipFile = await JSZip.loadAsync(data);
      let vttFile = "";

      for (const file in zipFile.files) {
        const fileSplittedOnDot = file.split(".");
        const fileExtension = fileSplittedOnDot.at(-1);

        if (fileExtension === "json") {
          const jsonString = await zipFile.files[file].async("string");
          const commandClipsJson = JSON.parse(jsonString);
          for (const commandClipJson of commandClipsJson) {
            localforage.setItem(commandClipJson["id"] + "data", {"afterText": commandClipJson["afterText"]});
          }
        } else if (fileExtension === "wav") {
          includesWaveFiles = true;
          const audioBlob = await zipFile.files[file].async("blob");
          localforage.setItem(fileSplittedOnDot[0], audioBlob);
        } else if (fileExtension === "vtt") {
          includesTranscriptFile = true;
          vttFile = await zipFile.files[file].async("string");
          const data = vttToDraft(vttFile);
          setTaskId(data[1]);
          transcriptData = data[0];
          id = "task_id:" + data[1];
          fileName = zipFile.files[file].name;
        } else {
          const videoNode = document.createElement("video");
          const canPlayAudio = videoNode.canPlayType("audio/" + fileExtension);
          const canPlayVideo = videoNode.canPlayType("video/" + fileExtension);

          if (canPlayAudio || canPlayVideo) {
            includesMediaFile = true;
            const mediaBlob = await zipFile.files[file].async("blob");
            const fileURL = URL.createObjectURL(mediaBlob);
            mediaURL = fileURL;
            fileName = zipFile.files[file].name;
          }
        }
      }

      const doubleMacronBelow = '\u035f';
      const vttWithoutDoubleMacronBelow = vttFile.replaceAll(doubleMacronBelow, '');
      const vttWithoutPlaceholderSpaces = vttWithoutDoubleMacronBelow.replaceAll(' '.repeat(5), ' ').
        replaceAll(' '.repeat(4), ' ');


      if (!includesTranscriptFile || (!includesWaveFiles && !includesMediaFile)) {
        this.setState({
          processing: false,
          errorReadingFile: true,
        });
      } else if (includesWaveFiles) {
        this.setState({
          transcriptData: transcriptData,
          mediaUrl: includesMediaFile ? mediaURL : "no media",
          id: id,
          mode: DEFAULT_MODE,
          processing: false,
          vttFile: vttWithoutPlaceholderSpaces,
        });
      } else {
        this.setState({
          transcriptData: transcriptData,
          mediaUrl: mediaURL,
          id: id,
          mode: DEFAULT_MODE,
          processing: false,
          vttFile: vttWithoutPlaceholderSpaces,
        });
      }

    });
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
        mode: DEFAULT_MODE,
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
    let text = await GetVttFromId(token, this.state.taskId);
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
                  {ONE_FILE_MODE ? "Load Task" : "Load Media File"}
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

              <div style={{ display: "flex", flexDirection: "row" }}>
                <input
                  name="isGoing"
                  type="checkbox"
                  onChange={(e) => {
                    this.setState({agreement: e.target.checked});
                  }}
                  style={{ alignSelf: "center" }}
                />
                <p href={AGREEMENT} style={{ fontSize: 10, alignSelf: "center" }}>
                  {" "}
                  I agree to the terms and conditions of this{" "}
                </p>
                <div style={{ width: 5 }}> </div>
                <a
                  href={AGREEMENT}
                  style={{
                    fontSize: 10,
                    alignSelf: "center",
                    display: "table-cell",
                  }}
                  target="_blank"
                >
                  {" "}
                  agreement
                </a>
              </div>
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
              {this.state.errorReadingFile && "Problems reading file, please load another file."}
              {this.state.processing && this.state.agreement && "Loading... This can take some time. Please be patient."}
              {this.state.processing && !this.state.agreement && "Loading... This can take some time. Please be patient. Do not forget to accept the agreement."}
              {!ONE_FILE_MODE &&
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
              }
            </div>

            {this.state.transcriptData && this.state.mediaUrl && (!ONE_FILE_MODE || this.state.agreement) && (
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
                    mode: this.state.mode,
                    vttFile: this.state.vttFile,
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
