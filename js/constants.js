/*  PLEASE CONFIGURE THOSE VALUES OR OKUMA WON'T WORK.
    booksURL can be on a different domain/subdomain if you prefer.
    The books are stored in a library. The library name can be whatever you want (here it's books)
*/
const port = 5500;

export function homeURL() {
    // If Localhost, convert to localhost
    if (window.location.hostname == "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.0.136") {
        return `http://${window.location.hostname}:${port}/`;
    }
    return "https://lat3xkitty.com/darkflame/";
}
export function readerURL() {
    // If Localhost, convert to localhost
    if (window.location.hostname == "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.0.136") {
        return `http://${window.location.hostname}:${port}/read.html`;
    }
    return "https://lat3xkitty.com/darkflame/read";
}
export function booksURL() {
    // If Localhost, convert to localhost
    if (window.location.hostname == "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.0.136") {
        return `http://${window.location.hostname}:${port}/library/`;
    }
    return "https://lat3xkitty.com/darkflame/library/";
}
export function websiteName() {
    return "DarkFlame Universe";
}
export function defaultLanguage() {
    return "en";
}
