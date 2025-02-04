'use client'

import { useState } from "react";

const TextInput = ({ onSubmit }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type something..."
      />
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
      >
        질문하기
      </button>
    </form>
  );
};

const TextResponse = ({ text, loading }) => {
  return (
    <div className="mt-4 p-4 border rounded-md bg-gray-100 text-gray-700">
      <p>{loading ? "Loading..." : `Response: ${text ? `You typed: "${text}"` : "Waiting for input..."}`}</p>
      </div>
  );
};

export default function TextInputResponse() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function CreateResponse(question) {
    setLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setResponse(`Error: ${errorData.error}`);
      } else {
        const data = await response.json();
        setResponse(data.answer);
      }
    } catch (error) {
      setResponse('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-6">
      <TextInput onSubmit={CreateResponse} />
      <TextResponse text={response} loading={loading} />
    </div>
  );
}
