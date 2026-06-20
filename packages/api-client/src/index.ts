export {
  ApiClient,
  ApiError,
  type ApiClientAuth,
  type ApiClientOptions,
  type HttpInit,
} from "./client";

export { createWebApi, type WebApi } from "./web/index";
export { createBotApi, type BotApi } from "./bot/index";
