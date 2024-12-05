import "../App.css";
import React from "react";
import { Redirect } from "react-router-dom";
import SlateTranscriptEditor from "../slate-transcript-editor-master/src/components/index.js";
import { isAuth } from "../user/User";
import {useLocation} from 'react-router-dom';
import LogoutButton from "../components/LogoutButton";
import BackButton from "../components/BackButton";

function SlateTranscriptEditorPage() {
  const props = useLocation();
  //props=props.state
  console.log("props")
  console.log(props.state.id)
  if (isAuth()) {
    return (
      <div>
      <BackButton></BackButton>
      <LogoutButton></LogoutButton>
      <SlateTranscriptEditor
        mediaUrl={props.state.mediaUrl}
        transcriptData={props.state.transcriptData}
        id={props.state.id}
        title={props.state.exportName}
        showTitle={true}
        showSpeakers={false}
        handleSaveEditor={props.state.uploadTranscript}
        fileName={props.state.fileName}
        mode={props.state.mode}
        vttFile={props.state.vttFile}
      />
      </div>
    );
  } else {
    return <Redirect to="login"></Redirect>;
  }
}
export default SlateTranscriptEditorPage;
