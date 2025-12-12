import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error: string };
}) {
  const { error } = await searchParams;

  const errorText =
    error === "invalid_credentials" ? "Invalid credentials" : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form
        action={login}
        className="space-y-4 w-full max-w-md p-6 bg-gray-800 rounded shadow"
      >
        <h1 className="text-2xl font-bold text-center">NetScrunch</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 border rounded"
          required
        />
        {errorText && <div className="text-red-500">{errorText}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
