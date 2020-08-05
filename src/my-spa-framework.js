export function SPA(containerQuery, registerCallback) {
  const container = document.querySelector(containerQuery);

  if (container === undefined) {
    throw new Error("Container is undefined.");
  }

  const registeredRoutes = {
    GET: [],
    POST: []
  };

  function preventRedirects(appendClickEvent) {
    Array.from(document.links).forEach(appendClickEvent);
    Array.from(
      document.querySelectorAll("input[type=submit], button[type=submit]")
    ).forEach(appendClickEvent);
    return;
  }

  function onRedirectingTagClicked(e) {
    e.preventDefault();
    const targetType = e.currentTarget.nodeName;

    let method, route;

    if (targetType === "A" || targetType === "BUTTON") {
      method = "GET";
      route = e.currentTarget.pathname;

      if (route === window.location.pathname) {
        return;
      }
    } else if (
      targetType === "INPUT" &&
      e.currentTarget.type.toLocaleLowerCase() === "submit"
    ) {
      let formElement = e.currentTarget.parentElement;

      while (formElement.nodeName !== "FORM") {
        if (formElement === null) {
          throw new Error("Form not found.");
        }

        formElement = formElement.parentElement;
      }

      method = formElement.method.toLocaleUpperCase();
      const action = new URL(formElement.action);
      const inputFields = Array.from(
        formElement.querySelectorAll("input")
      ).filter((x) => x.type.toLocaleLowerCase() !== "submit");

      if (inputFields.length > 0) {
        if (action.search === "") {
          action.search += "?";
        }

        for (const input of inputFields) {
          action.search += `${input.name}=${input.value}`;
        }
      }

      route = `${action.pathname}${action.search}${action.hash}`;
    }

    history.pushState({ method, route }, "", route);

    handleRequest(route, method);
  }

  function registerRoutingHandler(el) {
    if (typeof el.onclick === "function") {
      return;
    }

    el.onclick = onRedirectingTagClicked;
  }

  preventRedirects(registerRoutingHandler);

  const onRouteRendering = {
    swap(html) {
      container.innerHTML = html;
      preventRedirects(registerRoutingHandler);
      return;
    },
    load(resourcePath) {
      return fetch(resourcePath);
    },
    redirect(route) {
      history.pushState({ route, method: "GET" }, "", route);
      handleRequest(route, "GET");
      return;
    },
    params: {},
  };

  function handleRequest(route, method) {
    const { route: routeOnly, queryParams } = Array.from(
      route.matchAll(
        /^(?<route>[^?#]+)\??(?<queryParams>[^#]+)?\#?(?<hash>.+?)?$/g
      )
    )[0].groups;

    let formattedQueryParams = {};

    if (queryParams !== undefined) {
      formattedQueryParams = Array.from(
        queryParams.matchAll(/(?<key>[^=]+)=(?<value>[^&]+)/g)
      ).reduce(function (acc, cur) {
        acc[cur.groups.key] = cur.groups.value;

        return acc;
      }, {});
    }

    const mathcingRoute = registeredRoutes[method].filter((x) =>
      x[0].test(routeOnly)
    )[0];

    if (mathcingRoute === undefined) {
      throw new Error("404 - Not Found");
    }

    const [routeKey, response] = mathcingRoute;

    routeKey.lastIndex = 0;
    const routeQueryObj = routeKey.exec(route);

    const routeQueryGroups =
      routeQueryObj === null
        ? {}
        : routeQueryObj.groups === undefined
        ? {}
        : routeQueryObj.groups;

    onRouteRendering.params = Object.assign(
      routeQueryGroups,
      formattedQueryParams
    );

    if (typeof response === "function") {
      response();
    } else {
      throw new Error("404 - Not Found");
    }
  }

  function getRegex(route) {
    const matches = [
      ...route.matchAll(/(?:\/:(?<param>[^/]+))|(?:\/(?<route>[^/]+))/g),
    ];

    if (matches.length === 0) {
      return /^\/$/g;
    }

    return new RegExp(
      `^${matches
        .map((x) =>
          x.groups.param === undefined
            ? `\\/${x.groups.route}`
            : `\\/(?<${x.groups.param}>[^/?#]+)`
        )
        .join("")}$`,
      "gm"
    );
  }

  const onRouteRegistering = {
    get(route, callback) {
      registeredRoutes.GET.push([
        getRegex(route),
        callback.bind(onRouteRendering, onRouteRendering),
      ]);
      return;
    },
    post(route, callback) {
      registeredRoutes.POST.push([
        getRegex(route),
        callback.bind(onRouteRendering, onRouteRendering),
      ]);
      return;
    },
  };

  window.addEventListener("popstate", function (e) {
    const { method, route } = e.state;
    handleRequest(route, method);
    return;
  });

  const app = {
    run() {
      registerCallback.call(onRouteRegistering, onRouteRegistering);
      const initialRoute = window.location;
      onRouteRendering.redirect(
        `${initialRoute.pathname}${initialRoute.search}${initialRoute.hash}`
      );
      return;
    },
  };

  return app;
}
