function APlayer(option) {
    this.option = option;
}

APlayer.prototype.init = function () {
    this.element = this.option.element;
    this.music = this.option.music;

    // Define defult player texts
    this.option.defaultTexts = {
        error : "Loading problem",
        loading : "Loading audio file..."
    };

    // Check text attr in option
    if (!this.option.text){
        this.option.text = this.option.defaultTexts;
    }

    // Check error text attr in option
    if (this.option.text && !this.option.text.error){
        this.option.text.error = this.option.defaultTexts.error;
    }

    // Check loading text attr in option
    if (this.option.text && !this.option.text.loading){
        this.option.text.loading = this.option.defaultTexts.loading;
    }

    // parser lrc
    if (this.option.showlrc) {
        var lines = [];
        this.lrcTime = [];
        this.lrcLine = [];
        var lrcs = this.element.getElementsByClassName('aplayer-lrc-content')[0].innerHTML;
        lines = lrcs.split(/\n/);
        var timeExp = /\[(\d{2})\:(\d{2})\.(\d{2})\]/;
        var lrcExp = /](.*)$/;
        for (var i = 0; i < lines.length; i++) {
            var oneTime = timeExp.exec(lines[i]);
            var oneLrc = lrcExp.exec(lines[i]);
            if (oneTime && oneLrc) {
                this.lrcTime.push(parseInt(oneTime[1]) * 60 + parseInt(oneTime[2]) + parseInt(oneTime[3]) / 100);
                this.lrcLine.push(oneLrc[1]);
            }
        }
    }

    // fill in HTML
    this.element.innerHTML = ''
        + '<div class="aplayer-pic">'
        +     '<img src="' + this.music.pic + '">'
        +     '<div class="aplayer-button aplayer-pause aplayer-hide">'
        +         '<i class="demo-icon icon-pause2"></i>'
        +     '</div>'
        +     '<div class="aplayer-button aplayer-play">'
        +         '<i class="demo-icon icon-play3"></i>'
        +     '</div>'
        + '</div>'
        + '<div class="aplayer-info">'
        +     '<div class="aplayer-music">'
        +         '<span class="aplayer-title">' + this.music.title + '</span>'
        +         '<span class="aplayer-author"> - ' + this.option.texts.loading + '</span>'
        +     '</div>'
        +     '<div class="aplayer-lrc">'
        +         '<div class="aplayer-lrc-contents" style="top: 0"></div>'
        +     '</div>'
        +     '<div class="aplayer-controller">'
        +         '<div class="aplayer-bar-wrap">'
        +             '<div class="aplayer-bar">'
        +                 '<div class="aplayer-loaded" style="width: 0"></div>'
        +                 '<div class="aplayer-played" style="width: 0">'
        +                     '<span class="aplayer-thumb"></span>'
        +                 '</div>'
        +             '</div>'
        +         '</div>'
        +         '<div class="aplayer-time">'
        +             ' - <span class="aplayer-ptime">00:00</span> / <span class="aplayer-dtime">00:00</span>'
        +             '<div class="aplayer-volume-wrap">'
        +                 '<i class="icon-volume-medium"></i>'
        +                 '<div class="aplayer-volume-bar-wrap">'
        +                     '<div class="aplayer-volume-bar">'
        +                         '<div class="aplayer-volume" style="height: 80%"></div>'
        +                     '</div>'
        +                 '</div>'
        +             '</div>'
        +         '</div>'
        +     '</div>'
        + '</div>';

    // fill in lrc
    if (this.option.showlrc) {
        this.element.classList.add('aplayer-withlrc');
        var lrcHTML = '';
        this.lrcContents = this.element.getElementsByClassName('aplayer-lrc-contents')[0];
        for (i = 0; i < this.lrcLine.length; i++) {
            lrcHTML += '<p>' + this.lrcLine[i] + '</p>';
        }
        this.lrcContents.innerHTML = lrcHTML;
        this.lrcIndex = 0;
        this.lrcContents.getElementsByTagName('p')[0].classList.add('aplayer-lrc-current');
    }

    // switch to narrow style
    if (this.option.narrow) {
        this.element.classList.add('aplayer-narrow');
    }

    // create audio element
    this.audio = document.createElement("audio");
    this.audio.src = this.music.url;
    this.audio.preload = 'metadata';

    // set loop attribute from options
    if(this.option.loop){
        this.audio.loop = true;
    }else{
        this.option.loop = false;
    }

    // show audio time
    var _self = this;
    this.audio.addEventListener('durationchange', function() {
        _self.element.getElementsByClassName('aplayer-dtime')[0].innerHTML = _self.secondToTime(_self.audio.duration);
    });

    // can play: remove loading style, show loading progress bar
    this.audio.addEventListener('canplay', function() {
        _self.element.getElementsByClassName('aplayer-author')[0].innerHTML = ' - ' + _self.music.author;
        _self.loadedTime = setInterval(function () {
            var percentage = _self.audio.buffered.end(_self.audio.buffered.length - 1) / _self.audio.duration;
            _self.updateBar.call(_self, 'loaded', percentage, 'width');
            if (percentage === 1) {
                clearInterval(_self.loadedTime);
            }
        }, 500);
    });

    this.audio.addEventListener('error', function () {
        _self.element.getElementsByClassName('aplayer-author')[0].innerHTML = ' - ' + _self.option.texts.error;
    });

    // play and pause button
    this.playButton = this.element.getElementsByClassName('aplayer-play')[0];
    this.pauseButton = this.element.getElementsByClassName('aplayer-pause')[0];
    this.playButton.addEventListener('click', function () {
        _self.play.call(_self);
    });
    this.pauseButton.addEventListener('click', function () {
        _self.pause.call(_self);
    });

    // control play progress
    this.playedBar = this.element.getElementsByClassName('aplayer-played')[0];
    this.loadedBar = this.element.getElementsByClassName('aplayer-loaded')[0];
    this.thumb = this.element.getElementsByClassName('aplayer-thumb')[0];
    this.bar = this.element.getElementsByClassName('aplayer-bar')[0];
    var barWidth;
    this.bar.addEventListener('click', function (event) {
        var e = event || window.event;
        barWidth = _self.bar.clientWidth;
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / barWidth;
        _self.updateBar.call(_self, 'played', percentage, 'width');
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
    });

    this.thumb.addEventListener('mousedown', function () {
        barWidth = _self.bar.clientWidth;
        clearInterval(_self.playedTime);
        document.addEventListener('mousemove', thumbMove);
        document.addEventListener('mouseup', thumbUp);
    });

    function thumbMove (event) {
        var e = event || window.event;
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / barWidth;
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'played', percentage, 'width');
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
    }

    function thumbUp () {
        document.removeEventListener('mouseup', thumbUp);
        document.removeEventListener('mousemove', thumbMove);
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
        _self.play();
    }

    // control volume
    this.audio.volume = 0.8;
    this.volumeBar = this.element.getElementsByClassName('aplayer-volume')[0];
    var volumeBarWrap = this.element.getElementsByClassName('aplayer-volume-bar')[0];
    var volumeicon = _self.element.getElementsByClassName('aplayer-time')[0].getElementsByTagName('i')[0];
    var barHeight = 35;
    this.element.getElementsByClassName('aplayer-volume-bar-wrap')[0].addEventListener('click', function (event) {
        var e = event || window.event;
        var percentage = (barHeight - e.clientY + getElementViewTop(volumeBarWrap)) / barHeight;
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'volume', percentage, 'height');
        _self.audio.volume = percentage;
        if (_self.audio.muted) {
            _self.audio.muted = false;
        }
        if (percentage === 1) {
            volumeicon.className = 'icon-volume-medium';
        }
        else {
            volumeicon.className = 'icon-volume-medium';
        }
    });
    volumeicon.addEventListener('click', function () {
        if (_self.audio.muted) {
            _self.audio.muted = false;
            volumeicon.className = _self.audio.volume === 1 ? 'icon-volume-medium' : 'icon-volume-medium';
            _self.updateBar.call(_self, 'volume', _self.audio.volume, 'height');
        }
        else {
            _self.audio.muted = true;
            volumeicon.className = 'icon-volume-mute2';
            _self.updateBar.call(_self, 'volume', 0, 'height');
        }
    });

    // get element's view position
    function getElementViewLeft (element) {
        var actualLeft = element.offsetLeft;
        var current = element.offsetParent;
        var elementScrollLeft;
        while (current !== null){
            actualLeft += current.offsetLeft;
            current = current.offsetParent;
        }
        elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
        return actualLeft - elementScrollLeft;
    }
    function getElementViewTop (element) {
        var actualTop = element.offsetTop;
        var current = element.offsetParent;
        var elementScrollTop;
        while (current !== null){
            actualTop += current. offsetTop;
            current = current.offsetParent;
        }
        elementScrollTop = document.body.scrollTop + document.documentElement.scrollTop;
        return actualTop - elementScrollTop;
    }

    // autoplay
    if (this.option.autoplay) {
        this.play();
    }
};

// play
APlayer.prototype.play = function () {
    this.playButton.classList.add('aplayer-hide');
    this.pauseButton.classList.remove('aplayer-hide');
    this.audio.play();
    var _self = this;
    this.playedTime = setInterval(function () {
        _self.updateBar.call(_self, 'played', _self.audio.currentTime / _self.audio.duration, 'width');
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self);
        }
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(_self.audio.currentTime);
    }, 100);
};

// pause
APlayer.prototype.pause = function () {
    this.pauseButton.classList.add('aplayer-hide');
    this.playButton.classList.remove('aplayer-hide');
    this.audio.pause();
    clearInterval(this.playedTime);
};

// update progress bar (loading progress bar, play progress bar)
APlayer.prototype.updateBar = function (type, percentage, direction) {
    percentage = percentage > 0 ? percentage : 0;
    percentage = percentage < 1 ? percentage : 1;
    this[type + 'Bar'].style[direction] = percentage * 100 + '%';
};

// update lrc
APlayer.prototype.updateLrc = function (currentTime) {
    if (!currentTime) {
        currentTime = this.audio.currentTime;
    }
    if (currentTime < this.lrcTime[this.lrcIndex] || currentTime >= this.lrcTime[this.lrcIndex + 1]) {
        for (var i = 0; i < this.lrcTime.length; i++) {
            if (currentTime >= this.lrcTime[i] && (!this.lrcTime[i + 1] || currentTime < this.lrcTime[i + 1])) {
                this.lrcIndex = i;
                this.lrcContents.style.top = -this.lrcIndex * 20 + 'px';
                this.lrcContents.getElementsByClassName('aplayer-lrc-current')[0].classList.remove('aplayer-lrc-current');
                this.lrcContents.getElementsByTagName('p')[i].classList.add('aplayer-lrc-current');
            }
        }
    }
};

// format second to 00:00
APlayer.prototype.secondToTime = function (second) {
    var add0 = function (num) {
        return num < 10 ? '0' + num : '' + num;
    };
    var min = parseInt(second / 60);
    var sec = parseInt(second - min * 60);
    return add0(min) + ':' + add0(sec);
};