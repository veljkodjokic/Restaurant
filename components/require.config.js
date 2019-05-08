var components = {
    "packages": [
        {
            "name": "jquery-context-menu",
            "main": "jquery-context-menu-built.js"
        }
    ],
    "baseUrl": "components"
};
if (typeof require !== "undefined" && require.config) {
    require.config(components);
} else {
    var require = components;
}
if (typeof exports !== "undefined" && typeof module !== "undefined") {
    module.exports = components;
}