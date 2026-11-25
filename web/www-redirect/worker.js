// One address for the site: www keeps the path and query, and moves to the bare domain for good.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "react-plumber.com";
    return Response.redirect(url.toString(), 301);
  },
};
