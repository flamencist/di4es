var
	// Map over the di in case of overwrite
	_di = window.di;

exports.noConflict = function () {
    if (window.di === exports) {
        window.di = _di;
    }

    return exports;
};
