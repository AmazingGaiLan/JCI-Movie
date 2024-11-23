//#region Dependency
import InputField from "./components/ChatBox/InputField";
import MessagesArea from "./components/ChatBox/MessagesArea";
import Live2DField from "./components/Live2DField";
import Elma_bg from "./assets/images/bg.png";
import Upperfield from "./components/ChatBox/Upperfield";
import { Fragment, useState } from "react";
import useMessage from "./hook/useMessage";
import { messageProps, promptProps } from "./global/data/Interface";
import usePrompt from "./hook/usePrompt";
import { useOpenAI } from "./global/logic/OpenAIManager";
import { useSpeechAI } from "./global/logic/SpeechAIManager"; //TODO: disable speech
import {
  useImageOutputMessageStore,
  useInputMessageStore,
  useGeneralInfoModalStore,
  useMutedStore,
} from "./store/store";
import { Model, Role } from "./global/data/Enum";
import title from "./assets/images/title.png";
import MuteSwitch from "./components/MuteSwitch";
import { useRef } from "react";
import LanguageSwitch from "./components/LanguageSwitch";
import TabsSwitch from "./components/common/TabsSwitch";
import Tab from "./components/common/Tab";
import SuggestPrompts from "./components/ImageGenerator/SuggestPrompts";

import OpenAI from "openai";
import { Base64 } from "js-base64";
import LoadingMessage from "./components/ChatBox/LoadingMessage";
import SpecialPrompts from "./components/ImageGenerator/SpecialPrompts";
import demoImage from "./assets/images/demo2.png";
import monitorImage from "./assets/images/monitor.png";
import tableImage from "./assets/images/1.png";
import { Dialog, Transition } from "@headlessui/react";
import { saveAs } from "file-saver";
import GeneralInfoModal from "./components/common/GeneralInfoModal";
import { checkImage, downloadImage, toDataURL } from "./global/utilFunction";
import axios from "axios";
import { useTranslation } from "react-i18next";

//#endregion

function App() {
  //Live2D Model
  const [audioData, setAudioData] = useState<ArrayBuffer>(new ArrayBuffer(0));
  const [emotion, setEmotion] = useState("normal");

  //Boolean Flags
  const stopInput = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const { muted } = useMutedStore();

  //AI Hooks
  const { openAICalling } = useOpenAI();
  const { TTSCalling, STTStart, STTEnd, recognizedSpeech } = useSpeechAI(() => {
    setSpeaking(false);
  });

  //Messages & Prompts Management
  const { message } = useInputMessageStore();
  const { pushMessage, messageAdjusting } = useMessage();
  const { prompts, pushPrompt, promptAdjusting } = usePrompt();
  const { imageMessage, setImageMessage } = useImageOutputMessageStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [targetImagePrompt, setTargetImagePrompt] = useState<string>("");
  const [currentIndex, setIndex] = useState(prompts.length - 1);
  const [defaultImage, setDefaultImage] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const { setGeneralInfoModal } = useGeneralInfoModalStore();

  const { t } = useTranslation();

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    if (!defaultImage) {
      setIsOpen(true);
    }
  }

  const openAI_ApiKey = useRef<string>("6G>W(֜f");
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    openAI_ApiKey.current = import.meta.env.VITE_OPENAI_API_KEY;
  } else {
    setGeneralInfoModal({
      isModalOpen: true,
      type: "ERROR",
      title: "import env variable fail",
      content: "OPENAI_API_KEY not found.Please info admin",
    });
  }

  // const openai = new OpenAI({
  //   apiKey: Base64.decode(openAI_ApiKey.current),
  //   dangerouslyAllowBrowser: true,
  // });
  const handleUserSubmit = async (text?: string, model?: Model) => {
    //default no variable text input,
    //variable text have higher priority to send message

    stopInput.current = true;
    setLoading(true);
    console.log(stopInput.current);
    try {
      if (model && model === Model.dalle_3) {
        console.log("call DALL-E...");
        const targetPrompt = text ? text : message;
        console.log("Target Prompt=", targetPrompt);
        setTargetImagePrompt(targetPrompt);

        // const response = await openai.images.generate({
        //   model: "dall-e-3",
        //   prompt: targetPrompt,
        //   n: 1,
        //   size: "1792x1024",
        // });

        let image_url = "no response";
        const openaiApi = axios.create({});

        await openaiApi
          .post(import.meta.env.VITE_ELMAGPT_SERVER_API_IMAGE_GEN_URL, {
            model: "dall-e-3",
            prompt: targetPrompt,
            n: 1,
            size: "1792x1024",
          })
          .then((response) => {
            image_url = response.data.data[0].url ?? "no response";
          })
          .catch((error) => {
            console.error("An error occurred:", error);
            image_url = "" + error;
          });

        // const image_url = response.data[0].url ?? "no response";
        console.log("alex url=", image_url);
        // const msg: messageProps = {
        //   time: Date.now(),

        //   role: Role.User,
        //   content: image_url,
        //   liked: false,
        // };
        setImageMessage(image_url);
        setDefaultImage(false);
        // pushMessage([msg]);
        // pushPrompt([msg]);
      } else {
        console.log("call chatGPT...");
        const input: messageProps = text
          ? {
              time: Date.now(),
              role: Role.User,
              content: text,
              liked: false,
            }
          : {
              time: Date.now(),
              role: Role.User,
              content: message,
              liked: false,
            };

        pushMessage([input]);
        pushPrompt([input]);

        //Get OpenAI response
        const output = await openAICalling([
          ...prompts,
          { role: input.role, content: text ?? input.content } as promptProps,
        ]);

        //Get audioData from TTS
        if (!muted) {
          const _audioData = await TTSCalling(output.content);
          if (_audioData.byteLength > 0) setAudioData(_audioData);
        }

        //#region Save AI's Output
        pushMessage([input, messageAdjusting(output)]);
        const prompt_arg = promptAdjusting(output);
        prompt_arg && pushPrompt([input, prompt_arg]);
        //#endregion

        //Obtain Emotion
        const parts = output.content
          ? output.content.split(/<<e:(.*?)>>/)
          : "normal";
        setEmotion(parts[1]);
      }
    } catch (e) {
      console.error("[ERROR] Openai api call failed \n", e);
    }
    stopInput.current = false;
    setLoading(false);
  };

  const handleDownloadImage = () => {
    console.log("Download image", imageMessage, "...");
    if (imageMessage) {
      saveAs(imageMessage, "imageGenerated.jpg"); // Put your image URL here.
    } else {
      console.error("Fail download image");
    }
  };

  const handleSTTStart = () => {
    setSpeaking(true);
    STTStart(); //TODO: disable speech
  };
  const handleSTTEnd = () => {
    STTEnd(); //TODO: disable speech
  };

  const displayPrevImage = () => {
    let index = currentIndex - 1;
    console.log(prompts);
    while (index >= 0) {
      if (prompts[index].content?.includes("https://oaidalleapiprodscus")) {
        console.log(prompts[index].content);
        setImageMessage(prompts[index].content!);
        setIndex(index);
        return;
      }
      index--;
    }
    return;
  };

  const displayNextImage = () => {
    let index = currentIndex + 1;
    while (index < prompts.length) {
      if (prompts[index].content?.includes("https://oaidalleapiprodscus")) {
        console.log(prompts[index].content);
        setImageMessage(prompts[index].content!);
        setIndex(index);
        return;
      }
      index++;
    }
    return;
  };

  return (
    <div className="max-h-[95vh]">
      {/* Background  */}
      <div className="absolute h-full w-full -z-50 bg-blue-300">
        <img
          src={Elma_bg}
          alt="elma_model"
          className="h-full w-full overflow-hidden object-cover"
        />
      </div>
      {/* Content*/}
      <div className="absolute flex h-full w-full overflow-hidden">
        {/*Live2D Model Container*/}
        <div
          id="elmaContainer"
          className="flex flex-col w-[50%] 2xl:w-[40%] sm:visible invisible items-start"
        >
          <div className="h-1/3 w-full flex items-center justify-end p-5 2xl:p-20 z-50">
            <div className="w-[600px]">
              <img src={title} alt="title" className="scale-75 -z-30"></img>
              <div className="flex flex-row mt-5">
                <div className="flex flex-col w-full ">
                  <MuteSwitch />
                  <LanguageSwitch handleUserSubmit={handleUserSubmit} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row w-full h-2/3 items-center justify-end z-40">
            <Live2DField emotion={emotion} audioData={audioData} />
          </div>
        </div>
        {/*chatroom*/}
        <div className="w-[50%] 2xl:w-[60%] p-1 items-end justify-center z-10 ml-auto">
          <div className="w-full h-full grid grid-cols-1 grid-rows-6 gap-4">
            <Upperfield />
            <div className="row-span-5 bg-neutral-600 rounded-lg p-4">
              <MessagesArea loading={stopInput.current} speaking={speaking} />
              <div className="flex flex-row mt-1">
                <span
                  className={`w-2 h-2 bg-green-400 rounded-full mx-1`}
                  id="on/off button dot"
                ></span>
                <span
                  className="w-2 h-2 bg-yellow-300 rounded-full"
                  id="on/off button dot"
                ></span>
              </div>
            </div>
            <div className="row-start-8">
              <InputField
                handleUserSubmit={handleUserSubmit}
                stopInput={stopInput.current}
                handleSTTStart={handleSTTStart}
                handleSTTEnd={handleSTTEnd}
                speaking={speaking}
                recognizedSpeech={recognizedSpeech} //TODO: disable speech
              />
            </div>
          </div>
        </div>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>
        </Dialog>
      </Transition>
      <GeneralInfoModal />
    </div>
  );
}

export default App;
