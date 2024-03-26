import { Message } from "node-telegram-bot-api";
import { AppUser } from "./models";

export const getFormattedUsername = (user: AppUser) => {
  if (user.username) {
    return `@${user.username}`;
  }

  return `<a href="tg://user?id=${user.telegramId}">${user.firstName}</a>`;
};

export const getFormattedUsernameFromMessage = (msg: Message) => {
  const user = msg.from;
  if (!user) {
    return "";
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
};
