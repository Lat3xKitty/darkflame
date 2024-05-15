/*  PLEASE CONFIGURE THOSE VALUES OR OKUMA WON'T WORK.
    booksURL can be on a different domain/subdomain if you prefer.
    The books are stored in a library. The library name can be whatever you want (here it's books)
*/
const port = 5500;

const isTestURL = (
    window.location.hostname == "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "192.168.0.136" ||
    window.location.hostname === "192.168.1.146"
);
const defaultHostName = "lat3xkitty.com/darkflame";

export function homeURL() {
    if (isTestURL) {
        return `http://${window.location.hostname}:${port}/`;
    }
    return `https://${defaultHostName}/`;
}
export function readerURL() {
    if (isTestURL) {
        return `http://${window.location.hostname}:${port}/read.html`;
    }
    return `https://${defaultHostName}/read`;
}
export function booksURL() {
    if (isTestURL) {
        return `http://${window.location.hostname}:${port}/library/`;
    }
    return `https://${defaultHostName}/library/`;
}
export function websiteName() {
    return "DarkFlame Universe";
}
export function defaultLanguage() {
    return "en";
}
