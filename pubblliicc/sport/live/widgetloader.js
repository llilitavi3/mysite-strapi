!function () {
    const createAndAppendElementByParams = (tag, params = []) => {
        const el = document.createElement(tag);
        params.forEach(param => {
            el.setAttribute(param.name, param.value);
        });
        document.currentScript.parentNode.insertBefore(el, document.currentScript);
    };
    const parentScript = function () {
        let scriptTarget,
            temporaryScriptTarget = document.currentScript;
        if (temporaryScriptTarget && temporaryScriptTarget.src) scriptTarget = temporaryScriptTarget;
        if (!scriptTarget) throw new Error("Could not find current script tag");
        return scriptTarget;
    }();
    const hostName = parentScript.getAttribute("s");
    if (!!hostName) {
        const CSS_FILE_NAME = 'main.f500bfaf.css';
        const JS_FILE_NAME = 'main.6cceff07.js';
        createAndAppendElementByParams(
            'link',
            [
                {name: 'href', value: 'https://fonts.googleapis.com/css?family=Rajdhani:300,400,500,600,700&display=swap'},
                {name: 'rel', value: `stylesheet`},
            ]
        );
        createAndAppendElementByParams(
            'link',
            [
                {name: 'href', value: 'https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,500,600,700&display=swap'},
                {name: 'rel', value: `stylesheet`},
            ]
        );
        createAndAppendElementByParams(
            'link',
            [
                {name: 'href', value: `${hostName}/static/css/${CSS_FILE_NAME}`},
                {name: 'rel', value: `stylesheet`},
            ]
        );
        createAndAppendElementByParams(
            'script',
            [
                {name: 'async', value: true},
                {name: 'src', value: `${hostName}/static/js/${JS_FILE_NAME}`},
            ]
        );
    } else {
        console.error("Global window object or host error");
    }
}();
