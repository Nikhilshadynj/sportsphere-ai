import { channel } from "../config/rabbit";
import { getIO } from "../config/socket";

export const startConversationConsumer =
  async () => {

    channel.consume(
      "conversation.updated",

      (message) => {

        if (!message) return;

        const data = JSON.parse(
          message.content.toString()
        );

        console.log(
          "Conversation Updated",
          data
        );

        getIO()
          .to(data.userId)
          .emit(
            "conversationUpdated",
            data
          );

        channel.ack(message);
      }
    );

    console.log(
      "✅ Conversation Consumer Started"
    );
  };