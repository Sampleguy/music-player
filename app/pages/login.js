import { login } from "../data/api.js";

// Shows the login form; calls onDone() after a right password.
export function showLogin(root, onDone) {
  root.innerHTML = `
    <form class="login">
      <h1>Music</h1>
      <input class="sr-only" name="username" autocomplete="username" value="music" readonly tabindex="-1">
      <input name="password" type="password" autocomplete="current-password" placeholder="Password" required autofocus>
      <button>Log in</button>
      <p class="error" role="alert"></p>
    </form>`;
  const form = root.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await login(form.password.value);
      onDone();
    } catch (err) {
      form.querySelector(".error").textContent = err.message;
    }
  });
}
