// What request-inspecting extensions do to every page: wrap fetch, look at each answer, catch nothing. Any request
// made through this fetch that fails is an unhandled rejection in the app, whoever made it and however they caught it.
const pageFetch = window.fetch;
window.fetch = function (...args) {
  const answer = pageFetch.apply(this, args);
  answer.then((response) => response.status);
  return answer;
};
