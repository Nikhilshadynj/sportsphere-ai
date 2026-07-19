import {
  UploadDocumentResponse,
  DocumentQueryRequest,
  DocumentQueryResponse,
} from "../types/document";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
}

export async function uploadDocument(
  file: File
): Promise<UploadDocumentResponse> {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Authentication token not found"
    );
  }

  const formData = new FormData();

  formData.append("document", file);

  const response = await fetch(
    `${API_BASE_URL}/ai/documents/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const result =
    (await response.json()) as UploadDocumentResponse;

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to upload document"
    );
  }

  return result;
}

export async function queryDocument(
  payload: DocumentQueryRequest
): Promise<DocumentQueryResponse> {
  const token =
    localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Authentication token not found"
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/ai/documents/query`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(payload),
    }
  );

  const data =
    (await response.json()) as
      | DocumentQueryResponse
      | {
          message?: string;
        };

  if (!response.ok) {
    throw new Error(
      "message" in data &&
        data.message
        ? data.message
        : "Unable to query document"
    );
  }

  return data as DocumentQueryResponse;
}