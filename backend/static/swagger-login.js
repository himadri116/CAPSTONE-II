(() => {
  const originalSwaggerUiBundle = window.SwaggerUIBundle;
  const authApiUrl = window.BUGSIGHT_AUTH_API_URL || "http://localhost:5000";
  const protectedPaths = [
    "/api/auth/me",
    "/predict",
    "/prediction-jobs",
    "/prediction-history",
    "/export-report",
    "/model-transparency",
    "/feedback",
    "/commits",
    "/branches",
    "/tags",
  ];
  let apiToken = null;
  let loginPromise = null;
  let resolveLogin = null;

  const dialog = document.createElement("dialog");
  dialog.className = "swagger-login-dialog";
  dialog.innerHTML = `
    <form class="swagger-login-form">
      <h2>Sign in to test this endpoint</h2>
      <p>This protected request needs your account credentials.</p>
      <label>
        Email
        <input name="email" type="email" autocomplete="username" required>
      </label>
      <label>
        Password
        <input name="password" type="password" autocomplete="current-password" required>
      </label>
      <p class="swagger-login-message" role="status" aria-live="polite"></p>
      <div class="swagger-login-actions">
        <button class="swagger-login-cancel" type="button">Cancel</button>
        <button class="swagger-login-submit" type="submit">Sign in</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);

  const form = dialog.querySelector("form");
  const message = dialog.querySelector(".swagger-login-message");
  const submitButton = dialog.querySelector(".swagger-login-submit");

  const finishLogin = (token) => {
    if (!resolveLogin) {
      return;
    }

    const resolve = resolveLogin;
    resolveLogin = null;
    dialog.close();
    resolve(token);
  };

  const requestLogin = () => {
    if (apiToken) {
      return Promise.resolve(apiToken);
    }
    if (loginPromise) {
      return loginPromise;
    }

    message.textContent = "";
    form.reset();
    loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
      dialog.showModal();
      form.querySelector("[name=email]").focus();
    }).finally(() => {
      loginPromise = null;
    });

    return loginPromise;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    submitButton.disabled = true;
    message.textContent = "Signing in…";

    try {
      const response = await fetch(`${authApiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.elements.email.value,
          password: form.elements.password.value,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Sign-in failed.");
      }
      if (typeof result.token !== "string" || !result.token) {
        throw new Error("The login response did not include a session token.");
      }

      apiToken = result.token;
      form.elements.password.value = "";
      finishLogin(apiToken);
    } catch (error) {
      message.textContent = error.message || "Could not sign in.";
    } finally {
      submitButton.disabled = false;
    }
  });

  dialog.querySelector(".swagger-login-cancel").addEventListener("click", () => {
    finishLogin("");
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finishLogin("");
  });

  const swaggerUiBundleWithLogin = (options) => {
    const existingInterceptor = options.requestInterceptor;
    options.requestInterceptor = async (request) => {
      const requestUrl = new URL(request.url, window.location.href);
      const requiresAuth = protectedPaths.some(
        (path) => requestUrl.pathname === path || requestUrl.pathname.startsWith(`${path}/`)
      );
      request.headers = request.headers || {};
      const hasAuthorization = Object.keys(request.headers).some(
        (header) => header.toLowerCase() === "authorization"
      );

      if (requiresAuth && !hasAuthorization) {
        const token = await requestLogin();
        if (token) {
          request.headers.Authorization = `Bearer ${token}`;
        }
      }

      return existingInterceptor
        ? existingInterceptor(request)
        : request;
    };

    return originalSwaggerUiBundle(options);
  };

  Object.assign(swaggerUiBundleWithLogin, originalSwaggerUiBundle);
  window.SwaggerUIBundle = swaggerUiBundleWithLogin;
})();
