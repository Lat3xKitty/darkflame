"use strict";
import { zoom } from './directive.js';
import * as CONSTANTS from './constants.js';
import { findGetParameter, stringToBoolean, fetchLanguages, infoToPageURL, infoToImageURL, assertsTitleExists, chooseLanguage, fetchLanguage, fetchLibrary, fetchBook, fetchVolume, notSafeForWorkWarning } from './tools.js';
import { setCookie, getCookie, getPosCookie, setPosCookie } from './cookie.js';

function getChapterCount() {
  let count = 0;
  for (let i = 0; i < VCONFIG.bookmarks.length; i++) {
    if (VCONFIG.bookmarks[i].type == 'chapter') count++;
  }
  return count;
}

function getChapterFirstPage(chapterNum) {
  let count = 1;
  for (let i = 0; i < VCONFIG.bookmarks.length; i++) {
    if (VCONFIG.bookmarks[i].type == 'chapter') {
      if (count == chapterNum) return VCONFIG.bookmarks[i].page;
      count++;
    }
  }
}

function getCurrentChapter(page = PAGE) {
  let i;
  for (i = 0; i < VCONFIG.bookmarks.length; i++) {
    if (VCONFIG.bookmarks[i].type == 'chapter') {
      if (VCONFIG.bookmarks[i].page > PAGE) return i;
    }
  }
  return i;
}

function imgFinishedLoading() {

  /* Create a list of pages to cache and then cache them asynchronously
  The list starts caching the next pages and then the previous pages
  (in case the user started from the middle of the book). */
  const numOfNextPagesToCache = 5;
  const numOfPreviousPagesToCache = 3;

  const pagesToCache = [];
  for (let i = 1; i < numOfNextPagesToCache + 1; i++) {
    if (PAGE + i <= VCONFIG.numPages) {
      pagesToCache.push(infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE + i, TCONFIG.fileExtension));
    }
  }
  for (let i = 1; i < numOfPreviousPagesToCache + 1; i++) {
    if (PAGE - i > 0) {
      pagesToCache.push(infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE - i, TCONFIG.fileExtension));
    }
  }

  // The list pagesToCache is finished, we can call the caching fonction
  precacheImages(pagesToCache);
  refreshLayoutNavImage();

}

function precacheImages(pagesToCache, currentIndex = 0) {
  if (currentIndex < pagesToCache.length) {
    getImage(pagesToCache[currentIndex]).then(function(successUrl) {
      precacheImages(pagesToCache, currentIndex + 1);
    });
  }
}

function getImage(url) {
  return new Promise(function(resolve, reject){
    const img = new Image();
    img.onload = function() {
      resolve(url);
    }
    img.onerror = function() {
      reject(url);
    }
    img.src = url;
  })
}

function refreshLayoutNavImage() {
  const margin = UCONFIG.pageWidthSlider / 100;
  const availableScreenWidth = window.innerWidth * margin;
  let horizontalLayoutHeight = (margin * window.innerHeight) * ((imgPageLeft.naturalWidth /  imgPageLeft.naturalHeight) || 1);
  let verticalLayoutWidthCSS = (margin * 100).toString() + "vw";
  if (UCONFIG.doublePage) {
    horizontalLayoutHeight *= 2;
    verticalLayoutWidthCSS = (margin * 100 / 2).toString() + "vw";
  }

  imgPageLeft.style.maxHeight = '100vh';
  imgPageRight.style.maxHeight = '100vh';
  imgPageLeft.style.width = verticalLayoutWidthCSS;
  imgPageRight.style.width = verticalLayoutWidthCSS;

  imgPageLeft.style.objectFit = "contain";
  imgPageRight.style.objectFit = "contain";
  refreshSidePages();
}

function toggleNavMenu() {
  if (IS_BAR_VISIBLE) {
    document.getElementById("topMenu").classList.add("hidden");
    document.getElementById("bottomMenu").classList.add("hidden");
  } else {
    document.getElementById("topMenu").classList.remove("hidden");
    document.getElementById("bottomMenu").classList.remove("hidden");
  }
  IS_BAR_VISIBLE = !IS_BAR_VISIBLE
}


function toggleHandlerElement(button, variableName, targets, className, refreshPages = false) {
  document.getElementById(button).onclick = function() {
    UCONFIG[variableName] = !UCONFIG[variableName];
    for (let i = 0; i < targets.length; i++) {
      if (UCONFIG[variableName]) {
        document.getElementById(targets[i]).classList.add(className[i]);
      } else {
        document.getElementById(targets[i]).classList.remove(className[i]);
      }
    }
    if (refreshPages) refreshDisplayPages();
  };
}

function goNextPage() {
  if (UCONFIG.doublePage) {
    changePage(PAGE + 2);
  } else {
    changePage(PAGE + 1);
  }
}

function goPreviousPage() {
  if (UCONFIG.doublePage) {
    changePage(PAGE - 2);
  } else {
    changePage(PAGE - 1);
  }
}

function changePage(newPage = null) {

  // When launch for the first time
  if (newPage == null) {

    const paramChapter = parseInt(findGetParameter('chapter'));
    const paramPage = parseInt(findGetParameter('page'));
    const pos = getPosCookie(TITLE);

    // If a page is indicated in the GET
    if (!Number.isNaN(paramPage)) {
      newPage = paramPage;
    // If a chapter is indicated in the GET
    } else if (!Number.isNaN(paramChapter)) {
      newPage = getChapterFirstPage(paramChapter);
    // If a page has been saved in the cookie
    } else if (pos != undefined && pos[VOLUME] != undefined) {
      newPage = pos[VOLUME];
    // Else open the first page
    } else {
      newPage = 1;
    }

  } else {

    /* Sanitize the parameters before actually changing the actual values */
    if (newPage < 1) {
      newPage = 1;
    } else if (newPage > VCONFIG.numPages) {
      newPage = VCONFIG.numPages;
    }

    // Correction for current page position depending on double page
    if (isDoublePagePossible(newPage) && newPage > 1) {
      if (VCONFIG.firstPagesDouble && newPage % 2 == 0) newPage -= 1;
      if (!VCONFIG.firstPagesDouble && newPage % 2 == 1) newPage -= 1;
    }

  }

  const hasPageChanged = newPage != PAGE;

  PAGE = newPage;

  if (TCONFIG.bookType == 'webtoon') {
    document.getElementById('continuousScrollingPages').innerHTML = "";
    const start = getChapterFirstPage(getCurrentChapter());
    let end = getChapterFirstPage(getCurrentChapter() + 1) - 1;
    if (getCurrentChapter() == getChapterCount()) {
      end = VCONFIG.numPages;
    }
    for (let i = start; i <= end; i++) {
      const img = document.createElement('img');
      img.src = infoToImageURL(LIBRARY, TITLE, VOLUME, i, TCONFIG.fileExtension);
      img.loading = "lazy";
      document.getElementById('continuousScrollingPages').appendChild(img);
    }
  }

  if (hasPageChanged) {
    refreshDisplayPages();
  }

  // Update the slider background gradient
  {
    const currentPosition = (parseInt(pageSlider.value) - 1) / (parseInt(pageSlider.max) - 1) * 100;
    pageSlider.style.background = "linear-gradient(90deg, var(--menu-text-color) 0%, var(--menu-text-color) " + currentPosition.toString() + "%, gray " + currentPosition.toString() + "%, gray 100%)";
  }

}

function addLoading() {
  ELEM_LOADING++;
  refreshLoading();
}

function removeLoading() {
  ELEM_LOADING--;
  refreshLoading();
}

function refreshLoading() {
  if (ELEM_LOADING > 0) {
    document.getElementById('loader').classList.add('enabled');
  } else {
    document.getElementById('loader').classList.remove('enabled');
  }
}

function isDoublePagePossible(targetPage = PAGE) {
  // To use double page, the user should have asked for double page
  let result = UCONFIG.useDoublePage;

  // To use double page, VCONFIG.disallowDoublePage should be true
  result &= !VCONFIG.disallowDoublePage;

  // If the VCONFIG file asked for the fist page to be single, doublePage should
  // only be enable for pages other than the first one
  result &= !(!VCONFIG.firstPagesDouble && targetPage == 1);

  // Lastly double page should be disable if the last page is left alone.
  result &= targetPage + 1 <= VCONFIG.numPages;

  return result;
}

function refreshSidePages() {
  /* Move the side page to simulate the fact that you place the next page on the side */
  if (UCONFIG.sidePages && UCONFIG.doublePage) {
    const sidePageMaxValue = Math.min(VCONFIG.numPages / 150 * 4, 6);
    const progress = PAGE / VCONFIG.numPages;
    const viewedPagesWidth = (progress * sidePageMaxValue * pageWidthSlider.value / 100).toString() + "vmin";
    const toBeViewedPagesWidth = ((1 - progress) * sidePageMaxValue * pageWidthSlider.value / 100).toString() + "vmin";

    if (TCONFIG.japaneseOrder) {
      navImage.style.paddingLeft = toBeViewedPagesWidth;
      navImage.style.paddingRight = viewedPagesWidth;
    } else {
      navImage.style.paddingLeft = viewedPagesWidth;
      navImage.style.paddingRight = toBeViewedPagesWidth;
    }
    document.getElementById("lighting").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";
    document.getElementById("specular").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";
    document.getElementById("bookFold").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";

  } else {

    navImage.style.paddingLeft = null;
    navImage.style.paddingRight = null;
    document.getElementById("lighting").style.backgroundSize = null;
    document.getElementById("specular").style.backgroundSize = null;
    document.getElementById("bookFold").style.backgroundSize = null;

  }
}

function refreshDisplayPages() {

  if (TCONFIG.bookType == 'webtoon') {

    window.scrollTo(0, 0);

  /* -------------------------- FOR BOOK MODE ONLY (NOT CONTINUOUS SCROLLING) ------------------------------------*/
  } else {

    UCONFIG.doublePage = isDoublePagePossible();

    if (UCONFIG.doublePage) {
      imgPageRight.style.display = null;
      navImage.classList.add("doublePage");
    } else {
      imgPageRight.style.display = "none";
      navImage.classList.remove("doublePage");
    }

    /* Load the current page*/
    {

      const leftPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE, TCONFIG.fileExtension);

      if (UCONFIG.doublePage) {

        const rightPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE + 1, TCONFIG.fileExtension);

        addLoading();
        getImage(rightPageURL).then(function(successUrl) {
          imgPageRight.src = rightPageURL;
          removeLoading();
        });

      }

      addLoading();
      getImage(leftPageURL).then(function(successUrl) {
        imgPageLeft.src = leftPageURL;
        imgFinishedLoading();
        removeLoading();
      });

    }

    refreshSidePages();

    if (UCONFIG.useDoublePage) {
      document.getElementById("bookFoldButton").style.display = null;
      document.getElementById("sidePagesButton").style.display = null;
    } else {
      document.getElementById("bookFoldButton").style.display = "none";
      document.getElementById("sidePagesButton").style.display = "none";
    }


  }

  /* -------------------------- FOR BOTH BOOK MODE AND CONTINUOUS SCROLLING ------------------------------------*/

  /*  Replace the current URL without reloading the page.
      Furthermore, if the use use to go back button, it will not go to the
      previous image but the actual previous page */
  {
    if (window.history.replaceState) {
      //prevents browser from storing history with each change:
      const newURL = infoToPageURL(LIBRARY, TITLE, VOLUME, PAGE);
      window.history.replaceState(null, '', newURL);
    }
  }


  /* Refresh the slider bar */
  {
    pageSlider.max = VCONFIG.numPages;
    pageSlider.value = PAGE.toString();
    pageSliderCurrent.innerText = PAGE.toString();
    pageSliderTotal.innerText = VCONFIG.numPages;
  }


  if (getChapterCount() > 1) {
    // Change currently selected chapter in chapterSelection
    chapterSelection.selectedIndex = getCurrentChapter() - 1;

    // Showing or hiding the previous chapter button$
    if (getCurrentChapter() > 1) {
      previousChapterButton.style.display = null;
    } else {
      previousChapterButton.style.display = "none";
    }

    // Showing or hiding the next chapter button
    if (getCurrentChapter() < getChapterCount()) {
      nextChapterButton.style.display = null;
    } else {
      nextChapterButton.style.display = "none";
    }
  }

  // Move the paper texture arround so it doesn't always looks the same between pages
  document.getElementById("paperTexture").style.backgroundPosition = Math.floor((Math.random() * 100) + 1).toString() + "%" + Math.floor((Math.random() * 100) + 1).toString() + "%";

  // Refresh the book info at the top

  var volumeName = null;
  if (TCONFIG.volumeNames && TCONFIG.volumeNames[VOLUME - 1]) {
    volumeName = TCONFIG.volumeNames[VOLUME - 1];
  }

  var volumePrefix = LCONFIG.titlePage.chapterLabel['chapter'] + ' ' + VOLUME;
  if (TCONFIG.volumeKey && LCONFIG.titlePage.chapterLabel[TCONFIG.volumeKey]) {
    volumePrefix = LCONFIG.titlePage.chapterLabel[TCONFIG.volumeKey] + ' ' + VOLUME;
  }
  else if (TCONFIG.volumeKey && TCONFIG.volumeKey === "none") {
    volumePrefix = '';
  }

  bookVolume.innerText = volumePrefix +
  (volumeName
    ? (TCONFIG.volumeKey !== "none" ? ": " : "") +
      volumeName
    : "");
}


// -----------------------------------------------------------------------------


function setHandlers() {
  // Hack to allow the user to switch direction of the pages


  /* EVENTS HANDLERS */

  /* -------------------------- FOR BOOK MODE ONLY (NOT CONTINUOUS SCROLLING) ------------------------------------*/
  if (TCONFIG.bookType != 'webtoon') {
    document.onkeydown = function() {
      //console.log(window.event.keyCode);
      switch (window.event.keyCode) {
        case 35: nextChapterButton.click(); break;
        case 36: previousChapterButton.click(); break;
      }

      if (TCONFIG.japaneseOrder) {
        switch (window.event.keyCode) {
          case 33: goPreviousPage(); break;
          case 34: goNextPage(); break;
          case 39: goPreviousPage(); break;
          case 37: goNextPage(); break;
        }
      } else {
        switch (window.event.keyCode) {
          case 34: goPreviousPage(); break;
          case 33: goNextPage(); break;
          case 37: goPreviousPage(); break;
          case 39: goNextPage(); break;
        }
      }
    };


    pageSlider.oninput = function() {
      changePage(parseInt(pageSlider.value));
    }

    pageSlider.onmousedown = function() {
      pageSlider.classList.add("inUse");
    }

    pageSlider.onmouseup = function() {
      document.activeElement.blur(); // Remove focus
      pageSlider.classList.remove("inUse");
    }

    toggleHandlerElement("doublePageButton", "useDoublePage", ["doublePageButton"], ["enabled"], true);
    toggleHandlerElement("bookFoldButton", "bookFold", ["bookFoldButton", "bookFold"], ["enabled", "enabled"]);
    toggleHandlerElement("lightingButton", "lighting", ["lightingButton", "lighting", "specular"], ["enabled", "enabled", "enabled"]);
    toggleHandlerElement("sidePagesButton", "sidePages", ["sidePagesButton"], ["enabled"], true);
    toggleHandlerElement("paperTextureButton", "paperTexture", ["paperTextureButton", "paperTexture"], ["enabled", "enabled"]);
    toggleHandlerElement("bookShadowButton", "bookShadow", ["bookShadowButton", "navImage"], ["enabled", "bookShadow"]);

    zoom(undefined, undefined, function (actionType) {
        if (actionType == "clickMiddle") {
          toggleNavMenu();

        } else {

          if (TCONFIG.bookType != 'webtoon') {

            if (actionType == "clickLeft") {
              if (TCONFIG.japaneseOrder) {
                goNextPage()
              } else {
                goPreviousPage();
              }

            } else if (actionType == "clickRight") {

              if (TCONFIG.japaneseOrder) {
                goPreviousPage();
              } else {
                goNextPage()
              }
            }

          }
        }
    });
    document.getElementsByClassName("zoom")[0].click();


    pageWidthSlider.oninput = function() {
      UCONFIG.pageWidthSlider = pageWidthSlider.value;
      refreshLayoutNavImage();
    }

    document.getElementById("navImageContainer").addEventListener('swiped-left', function() {
      // Check if zoom is active and ignore the swipe
      const image = document.getElementsByClassName("zoom")[0];
      if (image.classList.contains("active")) return;

      // If the book is in japanese order, the swipe left should go to the next page
      if (TCONFIG.japaneseOrder) {
        goPreviousPage();
      } else {
        goNextPage();
      }
    });

    document.getElementById("navImageContainer").addEventListener('swiped-right', function() {
      // Check if zoom is active and ignore the swipe
      const image = document.getElementsByClassName("zoom")[0];
      if (image.classList.contains("active")) return;

      // If the book is in japanese order, the swipe right should go to the previous page
      if (TCONFIG.japaneseOrder) {
        goNextPage();
      } else {
        goPreviousPage();
      }
    });

    let idleMouseTimer;
    let forceMouseHide = false;
  
    document.body.style.cursor = "none";
  
    // Your wrapper here
    document.body.addEventListener("mousemove", () => {
      if (forceMouseHide) {
        return;
      }
  
      document.body.style.cursor = "";
  
      clearTimeout(idleMouseTimer);
  
      idleMouseTimer = setTimeout(() => {
        document.body.style.cursor = "none";
  
        forceMouseHide = true;
  
        setTimeout(() => {
          forceMouseHide = false;
        }, 2000);
      }, 1000);
    });

  /* -------------------------- FOR CONTINUOUS SCROLLING MODE ONLY ------------------------------------*/
  } else {

    toggleHandlerElement("paperTextureButton", "continuousScrolling_paperTexture", ["paperTextureButton", "paperTexture"], ["enabled", "enabled"]);
    toggleHandlerElement("bookShadowButton", "continuousScrolling_bookShadow", ["bookShadowButton", "navImage"], ["enabled", "bookShadow"]);

    pageWidthSlider.oninput = function() {
      UCONFIG.pageWidthSlider = pageWidthSlider.value;
      document.getElementById("continuousScrollingPages").style.width = UCONFIG.pageWidthSlider + "vw";
    }

    document.getElementById("navImageContainer").onclick = function() {
      toggleNavMenu();
    }

    {
      document.getElementsByTagName('body')[0].classList.add("continuousScrolling");
      imgPageLeft.style.display = "none";
      imgPageRight.style.display = "none";
      sliderContainer.style.display = "none";
      document.getElementById("continuousScrollingPages").style.width = pageWidthSlider.value + "vw";
    }

  }

  /* -------------------------- FOR BOTH BOOK AND SCROLLING MODE ------------------------------------*/

  pageWidthSlider.onmouseup = function() {
    document.activeElement.blur(); // Remove focus
  }

  window.addEventListener('resize', function(event) {
    refreshLayoutNavImage();
  }, true);

  previousChapterButton.onclick = function() {
    if (chapterSelection.selectedIndex > 0) {
      chapterSelection.selectedIndex -= 1;
      chapterSelection.onchange()
    }
  }


  nextChapterButton.onclick = function() {
    if (chapterSelection.selectedIndex < chapterSelection.options.length - 1) {
      chapterSelection.selectedIndex += 1;
      chapterSelection.onchange()
    }
  }


  fullScreenButton.onclick = function() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.fullscreenEnabled) {
        document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
  }


  document.onfullscreenchange = function ( event ) {
    if (document.fullscreenElement) {
      fullScreenButton.classList.add("enabled");
    } else {
      fullScreenButton.classList.remove("enabled");
    }
  }


  chapterSelection.onchange = function() {
    changePage(getChapterFirstPage(chapterSelection.selectedIndex + 1));
    document.activeElement.blur(); // Remove focus
  }

  themeSelection.onchange = function() {

    // Save value to cookie
    UCONFIG.themeSelection = themeSelection.selectedIndex;

    // Remove all other theme
    for (let themeName in LCONFIG.readPage.configMenu.themeSelection) {
      body.classList.remove(themeName);
    }

    // Add the new theme
    body.classList.add(themeSelection.options[UCONFIG.themeSelection].value);
    document.activeElement.blur(); // Remove focus
  }

  languageSelection.onchange = function() {
    // Save value to cookie
    UCONFIG.lang = languageSelection.options[languageSelection.selectedIndex].value;
    fetchLanguage(UCONFIG.lang)
    .then(languageData => LCONFIG = languageData)
    .then(applyLanguage);
  }

  readingDirectionSelection.onchange = function() {
    // Save value to cookie
    UCONFIG.readingDirection = readingDirectionSelection.selectedIndex;
    document.activeElement.blur(); // Remove focus

    window.location.reload();
  }

  toggleHandlerElement("configButton", "configOpened", ["configMenu"], ["enabled"]);

  document.getElementById("closeMenu").onclick = function() {
    document.getElementById("configButton").click();
  };

  /* Populate the languageSelection menu with the languages from the lang/config.json */
  for (let key in LANGUAGES) {
    const option = document.createElement("option");
    option.text = LANGUAGES[key];
    option.value = key;
    languageSelection.appendChild(option);
  }

  const keys = Object.keys(LANGUAGES);
  for (let i in keys) {
    if (keys[i] == UCONFIG.lang) {
      languageSelection.selectedIndex = parseInt(i);
    }
  }

  if (VCONFIG.disallowDoublePage) doublePageButton.style.display = "none";

  const titleLink = document.createElement("a");
  titleLink.innerText = TCONFIG.title;
  titleLink.href = infoToPageURL(LIBRARY, TITLE);

  // Refresh the book info at the top
  bookTitle.appendChild(titleLink);

  // Hide the select chapter menu if there is just one chapter
  if (getChapterCount() < 2) {
    document.getElementById("chapterSelectionContainer").style.display = "none";
    nextChapterButton.style.display = "none";
    previousChapterButton.style.display = "none";
  } else {
    document.getElementById("chapterSelectionContainer").style.display = null;
    nextChapterButton.style.display = null;
    previousChapterButton.style.display = null;
  }

  // Hide the current volume label if there is just one volume
  if (TCONFIG.numVolumes < 2) {
    document.getElementById("bookVolume").style.display = "none";
  }

  // Hide config options when not suited
  if (!BOOKTYPE.useDoublePage)      document.getElementById("doublePageButton").style.display   = "none";
  if (!BOOKTYPE.bookFoldButton)     document.getElementById("bookFoldButton").style.display     = "none";
  if (!BOOKTYPE.sidePagesButton)    document.getElementById("sidePagesButton").style.display    = "none";
  if (!BOOKTYPE.lightingButton)     document.getElementById("lightingButton").style.display     = "none";
  if (!BOOKTYPE.paperTextureButton) document.getElementById("paperTextureButton").style.display = "none";
  if (!BOOKTYPE.bookShadowButton)   document.getElementById("bookShadow").style.display         = "none";
  document.getElementsByTagName("body")[0].style.touchAction = BOOKTYPE.touchAction;

  // Change the title of the webpage
  document.title = CONSTANTS.websiteName() + ' - ' + TCONFIG.title;

  // Apply type of book on the body
  body.classList.add(TCONFIG.bookType);

  // Event when the user leave/close the page
  window.onbeforeunload = function(){
    // Save the current UCONFIG state as cookie
    for (let [key, value] of Object.entries(UCONFIG)) {
      if (value != undefined) {
        if (getCookie(key) != value.toString()) setCookie(key, value, 365);
      }
    }

    // Save current position in the volume in cookies
    const pos = getPosCookie(TITLE, true);
    pos[VOLUME] = PAGE;
    setPosCookie(pos, TITLE);
  };

}

function applyLanguage() {
  /* Localize all the options in the config menu */
  for (let key in LCONFIG.readPage.configMenu) {
    if (typeof LCONFIG.readPage.configMenu[key] === 'string') {
      document.getElementById(key).getElementsByTagName('p')[0].innerText = LCONFIG.readPage.configMenu[key];
    }
  }

  /* Populate the themeSelection menu with the themes from the language file */
  const currentThemeSelection = themeSelection.selectedIndex;
  themeSelection.innerHTML = "";
  for (let key in LCONFIG.readPage.configMenu.themeSelection) {
    const option = document.createElement("option");
    option.text = LCONFIG.readPage.configMenu.themeSelection[key];
    option.value = key;
    themeSelection.appendChild(option);
  }
  themeSelection.selectedIndex = currentThemeSelection;

  /* Populate the chapterSelection menu with the chapter from this title */
  const currentChapterSelection = chapterSelection.selectedIndex;
  chapterSelection.innerHTML = "";
  for (let i = 0; i < getChapterCount(); i++) {
    const option = document.createElement("option");
    option.text = LCONFIG.readPage.chapter + " " + (i + 1).toString();
    chapterSelection.add(option);
  }
  chapterSelection.selectedIndex = currentChapterSelection;

  const currentReadingDirection = readingDirectionSelection.selectedIndex;
  readingDirectionSelection.innerHTML = "";
  for (let key in LCONFIG.readPage.configMenu.readingDirection) {
    const option = document.createElement("option");
    option.text = LCONFIG.readPage.configMenu.readingDirection[key];
    option.value = key;
    readingDirectionSelection.appendChild(option);
  }
  readingDirectionSelection.selectedIndex = currentReadingDirection;

  // Refresh the book info at the top
  bookVolume.innerText = LCONFIG.titlePage.volume + " " + VOLUME;
}

function applyCookie() {

  themeSelection.selectedIndex = (
   parseInt(getCookie('themeSelection')) || 
   (
    // Media Query to detect dark mode
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 0 : 1
   )
  );
  themeSelection.onchange();

  readingDirectionSelection.selectedIndex = (
   getCookie('readingDirection') || 'original'
  );

  let defaultWidthSlider;
  if (TCONFIG.bookType === 'webtoon') {
    if( window.innerHeight > window.innerWidth ) {
      defaultWidthSlider = 100;
    } else {
      defaultWidthSlider = 40;
    }
  } else {
    defaultWidthSlider = 100;
  }
  pageWidthSlider.value = parseInt(getCookie('pageWidthSlider') || defaultWidthSlider);
  pageWidthSlider.oninput();

  // If screen is in landscape mode, realistic options are true by default
  const defaultRealisticOption = false;

  // Everytime, we set the inverse of what we want and then click on the button to get back to the state we want
  if (BOOKTYPE.bookFoldButton) {
    const cookieValue = getCookie('bookFold');
    UCONFIG.bookFold = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    bookFoldButton.click();
  }

  if (BOOKTYPE.lightingButton) {
    const cookieValue = getCookie('lighting');
    UCONFIG.lighting = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    lightingButton.click();
  }

  if (BOOKTYPE.paperTextureButton) {
    const cookieValue = getCookie('paperTexture');
    UCONFIG.paperTexture = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    paperTextureButton.click();
  }

  if (BOOKTYPE.sidePagesButton) {
    const cookieValue = getCookie('sidePages');
    UCONFIG.sidePages = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    sidePagesButton.click();
  }

  if (BOOKTYPE.bookShadowButton) {
    const cookieValue = getCookie('bookShadow');
    UCONFIG.bookShadow = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    bookShadowButton.click();
  }

  if (BOOKTYPE.useDoublePage) {
    const cookieValue = getCookie('useDoublePage');
    UCONFIG.useDoublePage = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
    doublePageButton.click();
  }

}

function getDOMElements() {
  if (TCONFIG.japaneseOrder) {

    imgPageLeft = document.getElementById("imgPageRight");
    imgPageRight = document.getElementById("imgPageLeft");

    pageSliderCurrent = document.getElementById("pageSliderRight");
    pageSliderTotal = document.getElementById("pageSliderLeft");

    previousChapterButton = document.getElementById("rightChapterButton");
    nextChapterButton = document.getElementById("leftChapterButton");

    pageSlider.style.transform = "rotateZ(180deg)";

  } else {

    imgPageLeft = document.getElementById("imgPageLeft");
    imgPageRight = document.getElementById("imgPageRight");

    pageSliderCurrent = document.getElementById("pageSliderLeft");
    pageSliderTotal = document.getElementById("pageSliderRight");

    previousChapterButton = document.getElementById("leftChapterButton");
    nextChapterButton = document.getElementById("rightChapterButton");

  }
}

function setBookTypeConfig() {
  BOOKTYPE = {
    "useDoublePage": false,
    "bookFoldButton": false,
    "sidePagesButton": false,
    "lightingButton": false,
    "paperTextureButton": false,
    "bookShadowButton": false,
    "touchAction": "none"
  }

  switch (TCONFIG.bookType) {
    case "imageset":
      BOOKTYPE.bookShadowButton = true;
      break;
    case "webtoon":
      BOOKTYPE.bookShadowButton = true;
      BOOKTYPE.touchAction = "pan-y"
      break;
    case "manga":
    case "book":
      BOOKTYPE.useDoublePage = true;
      BOOKTYPE.bookFoldButton = true;
      BOOKTYPE.sidePagesButton = true;
      BOOKTYPE.lightingButton = true;
      BOOKTYPE.paperTextureButton = true;
      BOOKTYPE.bookShadowButton = true;
      break;
  }
}

// -----------------------------------------------------------------------------
let imgPageLeft;
let imgPageRight;
let previousChapterButton;
let nextChapterButton;
let pageSliderCurrent;
let pageSliderTotal;

const navImage = document.getElementById("navImage");
const bookTitle = document.getElementById("bookTitle");
const bookVolume = document.getElementById("bookVolume");
const body = document.getElementsByTagName("body")[0];

const fullScreenButton = document.getElementById("fullScreenButton");
const doublePageButton = document.getElementById("doublePageButton");

const themeSelection = document.getElementById("themeSelection");
const languageSelection = document.getElementById("languageSelection");
const readingDirectionSelection = document.getElementById("readingDirectionSelection");
const chapterSelection = document.getElementById("chapterSelection");
const pageSlider = document.getElementById("pageSlider");
const pageWidthSlider = document.getElementById("pageWidthSlider");


const libraryParam = findGetParameter('library');
const LIBRARY = libraryParam ? libraryParam : CONSTANTS.booksURL();

const TITLE = findGetParameter('title');

// Retrieve the VOLUME
const volumeParam = parseInt(findGetParameter('volume'));
const VOLUME = !Number.isNaN(volumeParam) ? volumeParam : 1;

let PAGE;         // Stores the current page

let UCONFIG = {}  // User CONFIG that will be saved as cookies
let LCONFIG;      // Language JSON config File
let TCONFIG;      // Title JSON config File
let VCONFIG;      // Volume JSON config File

let IS_BAR_VISIBLE = true;  // are the navbars visible
let ELEM_LOADING = 0;       // The number of element currently loading

let LANGUAGES;  // Stores the list of available languages

let BOOKTYPE; // Store the specific configuration for this type of document (book, manga, webtoon, imageset...)

fetchLanguages()
  .then(languages => LANGUAGES = languages.languages)
  .then(chooseLanguage)
  .then(language => UCONFIG.lang = language)
  .then(() => fetchLanguage(UCONFIG.lang))
  .then(languageData => LCONFIG = languageData)
  .then(() => {
    // Get the Language reading direction and set it in UCONFIG early
    UCONFIG.preferedReadingDirection = (
      parseInt(getCookie('readingDirection')) || 0
    );
  })
  .then(() => notSafeForWorkWarning(LCONFIG))
  .then(() => fetchLibrary(LIBRARY))
  .then(libraryData => assertsTitleExists(libraryData.titles, TITLE))
  .then(() => fetchBook(LIBRARY, TITLE))
  .then(bookData => {
    TCONFIG = bookData

    // Overwrite the preferedReadingDirection if the user has a preference
    if (UCONFIG.preferedReadingDirection != 0) {
      TCONFIG.japaneseOrder = UCONFIG.preferedReadingDirection === 2;
    }
  })
  .then(setBookTypeConfig)
  .then(getDOMElements)
  .then(() => fetchVolume(LIBRARY, TITLE, VOLUME))
  .then(volumeData => VCONFIG = volumeData)
  .then(applyLanguage)
  .then(changePage)
  .then(setHandlers)
  .then(applyCookie);
