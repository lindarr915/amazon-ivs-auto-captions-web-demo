const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require('@aws-sdk/client-transcribe-streaming');

const {
  AWS_REGION,
  AUDIO_LANGUAGE_TRANSCRIBE_CODE,
  AUDIO_LANGUAGE_CODE,
  MEDIA_SAMPLE_RATE_HERTZ,
  CUSTOM_VOCABULARY_NAME,
  VOCABULARY_FILTER,
  VOCABULARY_FILTER_METHOD,
  WRITER_WEBSOCKET_API_URL,
  TRANSLATE_ENABLED,
  TRANSLATE_WEBSOCKET_URL,
  MEDIA_ENCODING,
  WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
  SUCCESS_EXIT_CODE,
  ERROR_EXIT_CODE,
  TWO_ROW_CHARACTER_COUNT,
} = require('./constants');

const metadataManager = require('./metadataManager');
const WebSocketManager = require('./utils/webSocketManager');
const shortenTranscriptText = require('./utils/shortenTranscriptText');

const net = require("net");
// Replace these with the actual host and port of your TCP server
const host = process.env.WHISPER_STREAMING_HOST || 'localhost';
const port = process.env.WHISPER_STREAMING_PORT || '43007'

const { OVERLAYS_UTILS } = require('./utils');
const { parse } = require("path");

const directTranscriptionWSManager = new WebSocketManager(WRITER_WEBSOCKET_API_URL);
directTranscriptionWSManager.connect();

let translateTranscriptionWSManager;
if (TRANSLATE_ENABLED == 'true') {
  translateTranscriptionWSManager = new WebSocketManager(TRANSLATE_WEBSOCKET_URL);
  translateTranscriptionWSManager.connect();
}

let overlaysInformation = null;
let endTimePrev = null;
let feedTime = process.argv[2];
let previousSentCaptionEndTimeTranscribe = 0;
let previousSentCaptionEndTimeTranslate = 0;


function removeNullCharacters(inputString) {
  // Use a regular expression to replace all NULL characters with an empty string
  return inputString.replace(/\u0000/g, '');
}

const streamAudioToWebSocket = async function () {
  process.stdin._writableState.highWaterMark = 4096; // Read with chunk size of 3200 as the audio is 16kHz linear PCM
  process.stdin.resume();

  const transcribeInput = async function* () {
    for await (const chunk of process.stdin) {
      if (chunk.length > 6000) continue;
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  };
  // Call Amazon Transcribe APIs to get live captions for Engilsh subtitle
  const transcribeClient = new TranscribeStreamingClient({
    region: AWS_REGION,
  });

  const startStreamTranscriptionCommand = new StartStreamTranscriptionCommand({
    LanguageCode: AUDIO_LANGUAGE_TRANSCRIBE_CODE,
    VocabularyName: CUSTOM_VOCABULARY_NAME,
    VocabularyFilterName: VOCABULARY_FILTER,
    VocabularyFilterMethod: VOCABULARY_FILTER_METHOD,
    MediaSampleRateHertz: MEDIA_SAMPLE_RATE_HERTZ,
    MediaEncoding: MEDIA_ENCODING,
    AudioStream: transcribeInput(),
  });

  // Connect to Whisper Streaming Socket to get live captions for Engilsh subtitle
  let buffer = "";

  // Connect to the server

  console.log("Connecting to socket");
  try {
    const socket = await connectToSocket();

    // You can now use 'socket' for sending and receiving data
    process.stdin.pipe(socket);

    socket.on("data", (data) => {

      buffer += removeNullCharacters(data.toString("utf-8"));

      // Check if we received a full line object
      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const response = removeNullCharacters(buffer.substring(0, boundary).trim());
        buffer = buffer.substring(boundary + 1);

        try {
          responseStartTime = response.substring(0, response.indexOf(" "));
          responseEndTime = response.substring(
            response.indexOf(" ") + 1,
            response.indexOf(" ", response.indexOf(" ") + 1)
          );
          text = response.substring(
            response.indexOf(" ", response.indexOf(" ") + 1) + 1
          );
          console.log(responseStartTime + " " + responseEndTime + " " + text);

          parsedTranscription = {
            startTime: +feedTime + (+responseStartTime / 1000),
            endTime: +feedTime + (+responseEndTime / 1000),
            text: text,
            partial: false
          }

          caption = buildCaptionForTotalTranscribe(parsedTranscription);
          // console.log(caption.toString())
          buildAndSendPayload(caption, "zh-TW");

          if (TRANSLATE_ENABLED == 'true') {
            caption = buildCaptionForTotalTranslate(parsedTranscription);
            buildAndSendPayload(caption, null);
          }
  

        } catch (e) {
            console.error("Error!" + e.toString())
        }

        boundary = buffer.indexOf("\n");
      }
    });

    // You can close the socket when you're done
    // socket.end();
  } catch (error) {
    console.error("Failed to connect:", error);
  }


  const startStreamTranscriptionCommandOutput = await transcribeClient.send(startStreamTranscriptionCommand);

  console.log(`AWS Transcribe connection status code: ${startStreamTranscriptionCommandOutput.$metadata.httpStatusCode}`);

  for await (const transcriptionEvent of startStreamTranscriptionCommandOutput.TranscriptResultStream) {
    if (transcriptionEvent.TranscriptEvent.Transcript) {
      const results = transcriptionEvent.TranscriptEvent.Transcript.Results;
      const parsedTranscription = parseTranscription(results);

      if (parsedTranscription) {
        let caption;

        // AUDIO TRANSCRIPTION
        if (AUDIO_LANGUAGE_CODE == 'en') {
          metadataManager.sendOverlaysMetadata(results, overlaysInformation);
          caption = buildCaptionForPartial(parsedTranscription);
          buildAndSendPayload(caption, AUDIO_LANGUAGE_CODE);
        } else if (parsedTranscription.partial === false) {
          caption = buildCaptionForTotalTranscribe(parsedTranscription);
          buildAndSendPayload(caption, AUDIO_LANGUAGE_CODE);
        }

      }
    }
  }
};

const startStreamingWrapper = async function () {
  try {
    await streamAudioToWebSocket();
    process.exit(SUCCESS_EXIT_CODE);
  } catch (error) {
    console.log('Streaming error: ', error);
    process.exit(ERROR_EXIT_CODE);
  }
};

const getOverlays = async () => {
  try {
    let utilsResponse = await OVERLAYS_UTILS.getOverlaysMapAndPattern();
    overlaysInformation = utilsResponse;
  } catch (ex) {
    console.log("Overlays couldn't be loaded. Exception throwed: ", ex);
  }
};

const parseTranscription = (results) => {
  let startTime = null;
  let endTime = null;

  if (results && results.length > 0) {
    if (results[0].Alternatives.length > 0) {
      const transcriptText = results[0].Alternatives[0].Transcript;

      startTime = endTimePrev ?? +feedTime + +results[0].StartTime;
      endTime = +feedTime + +results[0].EndTime;
      endTimePrev = endTime;

      if (results[0].IsPartial === false) {
        endTimePrev = null;
      }

      console.info(
        new Date(),
        '[Transcription to send to WebSocket] Feed Time: ',
        feedTime,
        ', Transcribe Start time: ',
        results[0].StartTime,
        ', Transcribe End Time: ',
        results[0].EndTime,
        ', Final Start time: ',
        startTime,
        ', Final End Time: ',
        endTime,
        ', Result Id ',
        results[0].ResultId,
        ', Is Partial: ',
        results[0].IsPartial
      );

      return {
        text: transcriptText,
        startTime,
        endTime,
        partial: results[0].IsPartial,
      };
    }

    return null;
  }

  return null;
};

const buildAndSendPayload = (data, lang) => {
  const payload = {
    action: WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
    data,
    lang,
  };

  lang !== null ? directTranscriptionWSManager.send(payload) : translateTranscriptionWSManager.send(payload);
};

const buildCaptionForPartial = (parsedTranscription) => {
  return {
    ...parsedTranscription,
    text: shortenTranscriptText(parsedTranscription.text),
  };
};

const getDisplayTime = (text) => {
  if (text.length <= TWO_ROW_CHARACTER_COUNT) return 4;
  return text.length / 20;
};


const buildCaptionForTotalTranscribe = (total) => {
  const caption = {};
  caption.partial = false;
  caption.text = total.text;
  // caption.startTime =
    // total.startTime > previousSentCaptionEndTimeTranscribe
      // ? total.startTime
      // : previousSentCaptionEndTimeTranscribe;
  // caption.endTime = caption.startTime + getDisplayTime(caption.text)
  caption.startTime = total.startTime
  if( total.endTime - total.startTime < 0.1 ){
    caption.endTime = caption.startTime + 0.1
  }
  else{
    caption.endTime = total.endTime
  }

  // previousSentCaptionEndTimeTranscribe = caption.endTime;

  return caption;
};

const buildCaptionForTotalTranslate = (total) => {
  const caption = {};
  caption.partial = false;
  caption.text = total.text;
  caption.startTime = total.startTime > previousSentCaptionEndTimeTranslate ? total.startTime : previousSentCaptionEndTimeTranslate;
  caption.endTime = total.endTime // Replacing caption.startTime + getDisplayTime(total.text);

  previousSentCaptionEndTimeTranslate = caption.endTime;

  return caption;
};

async function connectToSocket() {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host: host, port: port });

    client.on("connect", () => {
      console.log("Connected to the server");
      resolve(client);
    });

    client.on("error", (error) => {
      console.error("Error:", error);
      reject(error);
    });

    client.on("close", () => {
      console.log("Connection closed");
    });
  });
}


getOverlays();
startStreamingWrapper();