//#region Dependency
import { Role } from "../data/Enum";
import { messageSettings } from "../data/Prompts";
import { messageProps, promptProps } from "../data/Interface";
import { Base64 } from "js-base64";
import axios from "axios";
import { getDemoPrompt } from "./getDemoPrompt";
import { useTranslation } from "react-i18next";
//#endregion

const openaiApi = axios.create({
  headers: {
    Authorization: "Bearer " + import.meta.env.VITE_OPENAI_API_KEY,
    "Content-Type": "application/json",
  },
});

/* const configuration = new Configuration({
  apiKey: Base64.decode(import.meta.env.VITE_OPENAI_API_KEY),
}); */

//const openai = new OpenAIApi(configuration);

const getOutput = async (
  model: any,
  meessages: Array<promptProps>,
  max_tokens: any,
  stop: string,
  temperature: any,
  frequency_penalty: any,
  presence_penalty: any
) => {
  const demo_value = getDemoPrompt(
    meessages[meessages.length - 1].content as string
  );
  console.log(meessages[meessages.length - 1].content as string);
  if (demo_value !== "") {
    return demo_value;
  }

  const GPTModule = async (prompts: any) => {
    /*  try {
      const response = await openai.createChatCompletion({
        model: model,
        messages: prompts,
        max_tokens: max_tokens,
        stop: stop,
        temperature: temperature,
        frequency_penalty: frequency_penalty,
        presence_penalty: presence_penalty,
      });
      return response.data.choices[0].message?.content;
    } catch (error) {
      console.error("An error occurred:", error);
      return "" + error;
    } */
    const params: any = {
      model: model,
      messages: prompts,
      max_tokens: max_tokens,
      stop: stop,
      temperature: temperature,
      frequency_penalty: frequency_penalty,
      presence_penalty: presence_penalty,
    };
    let output = "回應出錯";

    await openaiApi
      // .post(import.meta.env.VITE_OPENAI_API_URL, params)
      .post(import.meta.env.VITE_OPENAI_API_URL, params)
      .then((response) => {
        output = response.data.choices[0].message?.content;
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        output = "" + error;
      });
    return output;
  };
  const output = (await GPTModule(meessages as any)) as string;

  return output;
};

export const useOpenAI = () => {
  const { i18n } = useTranslation();
  const openAICalling = async (prompts: Array<promptProps>) => {
    const targetUserPrefix =
      i18n.resolvedLanguage === "en"
        ? messageSettings.userPrefix_eng
        : messageSettings.userPrefix;

    console.log("openAI CALLING...");
    const prompts_api: Array<promptProps> = prompts.map(
      (prompt: promptProps) => {
        return {
          role: prompt.role,
          content:
            prompt.role === Role.User
              ? targetUserPrefix + prompt.content + messageSettings.userProfix
              : messageSettings.assistantPrefix +
                prompt.content +
                messageSettings.assistantProfix,
        };
      }
    );
    /* prompts_api[i].content =
        prompts_api[i].role === Role.User
        ? targetUserPrefix +
          prompts_api[i].content +
          messageSettings.userProfix
        : messageSettings.assistantPrefix +
          prompts_api[i].content +
          messageSettings.assistantProfix;
 */
    const output = await getOutput(
      messageSettings.model,
      prompts_api,
      messageSettings.max_tokens,
      messageSettings.stop,
      messageSettings.temperature,
      messageSettings.frequency_penalty,
      messageSettings.presence_penalty
    );
    const _arg: messageProps = {
      time: Date.now(),
      role: Role.Assistant,
      content: output,
      liked: false,
    };

    return _arg;
  };

  return { openAICalling };
};
