import axios from "axios";

const BASE_URL =
  "https://api.cricapi.com/v1";

export const getLiveMatches =
  async () => {
    try {
      const response =
        await axios.get(
          `${BASE_URL}/currentMatches`,
          {
            params: {
              apikey:
                process.env
                  .CRIC_API_KEY,

              offset: 0,
            },
          }
        );

      return response.data;
    } catch (error) {
      console.log(error);

      throw error;
    }
  };