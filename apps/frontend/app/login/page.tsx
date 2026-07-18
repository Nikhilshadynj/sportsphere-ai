"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:4000/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // token save
      localStorage.setItem("token", data.token);

      // redirect
      router.push("/");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Login
        </h1>


        <form onSubmit={handleLogin}>

          <div className="mb-4">
            <label className="block mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter email"
              required
            />
          </div>



          <div className="mb-4">

            <label className="block mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter password"
              required
            />

          </div>


          {
            error && (
              <p className="text-red-500 mb-4">
                {error}
              </p>
            )
          }


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-2 rounded"
          >
            {
              loading 
              ? "Logging in..."
              : "Login"
            }
          </button>


        </form>

      </div>

    </div>
  );
}