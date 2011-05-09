/**
 * Chat widget
 * Depends:
 *  * ucewidget.js
 *  * jqueryUI
 */
$.uce.Chat = function(){}
$.uce.Chat.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        title: "Conversations",
        lang: "fr",
        langs: ["fr", "en", "it"],
        mode: 'reduced',
        buttons: {}
    },
    // ucengine events
    meetingsEvents: {
        // Local events
        "chat.private.start"     : "_handlePrivateChatStart",

        // Events from U.C.Engine
        "twitter.hashtag.add"    : "_handleHashTag",
        "twitter.tweet.new"      : "_handleTweet",
        "chat.translation.new"   : "_handleTranslation",
        "chat.message.new"       : "_handleMessage",

        "internal.roster.add"    : "_handleJoin",
        "internal.roster.delete" : "_handleLeave",

        "roster.nickname.update" : "_handleNicknameUpdate"
    },
    _create: function() {
        var that = this;

        this.element.addClass('ui-chat ui-widget');

        this._content = $('<div>')
            .attr('class', 'ui-widget-content')
            .appendTo(this.element);

        var allConversations = $('<li>')
            .text("Chatroom")
            .click(function() {
                that._showConversation('all', that.options.lang);
            });

        var allHashtags = $('<li>')
            .text("Tweets")
            .click(function() {
                that._showHashtag('all');
            });

        var selectors = $('<div>')
            .attr('class', 'ui-chat-selectors')
            .appendTo(this._content);

        this._selectors = {};

        this._selectors.allConversations = $('<ul>')
            .attr('class', 'ui-chat-selector ui-chat-selector-conversations ui-chat-selector-all')
            .append(allConversations)
            .appendTo(selectors);

        this._selectors.conversations = $('<ul>')
            .attr('class', 'ui-chat-selector ui-chat-selector-conversations ui-chat-selector-elems')
            .appendTo(selectors);

        this._selectors.allHashtags = $('<ul>')
            .attr('class', 'ui-chat-selector ui-chat-selector-hashtags ui-chat-selector-all')
            .append(allHashtags)
            .appendTo(selectors);

        this._selectors.hashtags = $('<ul>')
            .attr('class', 'ui-chat-selector ui-chat-selector-hashtags ui-chat-selector-elems')
            .appendTo(selectors);

        /* create form to add hashtags */
        this._hashtagForm = $('<form>')
            .attr({'action': '#', 'method': 'post', 'class': 'ui-chat-hashtag-form'});

        var dash = $('<span>').text("#").appendTo(this._hashtagForm);

        var text = $('<input>').attr({'type': 'text', 'class': 'ui-chat-input'})
            .appendTo(this._hashtagForm);

        $('<input>').attr({'type': 'submit', 'value': 'OK'})
            .appendTo(this._hashtagForm);

        var that = this;
        this._hashtagForm.submit(function(e) {
            var metadata = {hashtag: '#' + text.val()};
            text.val("");
            that.options.ucemeeting.push("twitter.hashtag.add", metadata);
            return false;
        });
        this._hashtagForm.appendTo(selectors);

        this._containers = $('<ul>')
            .attr('class', 'ui-chat-containers')
            .appendTo(this._content);

        this._state = {};
        this._state.roster = {};
        this._state.hashtags = {};
        this._state.anonCounter = 1;

        var flags = $('<span>')
            .attr('class', 'ui-chat-flags');

        /* create message block for each language */
        this._flags = [];
        $.each(this.options.langs, function(i, lang) {
            var flag = $('<span>')
                .addClass('ui-chat-flag')
                .addClass('ui-chat-lang-' + lang)
                .button({
                    text: false,
                    icons: {primary: 'ui-chat-flag-icon'}
                })
                .click(function(e) {
                    that._showConversation('all', lang);
                    $.each(that._flags, function(index, flag) {
                        flag.removeClass('ui-state-highlight');
                    });
                    $(this).addClass('ui-state-highlight');
                });
            that._flags.push(flag);
            flag.appendTo(flags);

            that._addConversation("all", lang);
        });

        /* create space for all hashtags */
        this._addHashtag('all');

        this.options.buttons.right = [flags].concat(this.options.buttons.right || []);
        this.options.buttons.left = [];
        this.addHeader();

        /* set highlight to default flag */
        this.element.find('.ui-chat-flag.ui-chat-lang-' + this.options.lang)
            .addClass('ui-state-highlight');

        // Turn widget into initial mode
        if (this.options.mode == "reduced") {
            this.reduce();
        } else if (this.options.mode == "expanded") {
            this.expand();
        }
    },

    clear: function() {
        this._selectors.conversations.empty();
        this._selectors.hashtags.empty();

        this._containers.empty();

        if (this.options.mode == "reduced") {
            this.reduce();
        } else if (this.options.mode == "expanded") {
            this.expand();
        }
    },

    /**
     *  Modes
     */
    reduce: function() {
        this.options.mode = 'reduced';

        if (this._current) {
            this._showContainer(this._current);
        } else {
            this._hideContainers();
            this._showSelectors();
        }

        this.element.removeClass('ui-chat-expanded');
        this.element.addClass('ui-chat-reduced');
        this.element.find('.ui-chat-flags').hide();
    },

    expand: function() {
        this.options.mode = 'expanded';

        if (this._current) {
            this._showContainer(this._current);
        }
        else {
            this._hideContainers();
            this._showConversation('all', this.options.lang);
        }

        this._showSelectors();

        this.element.removeClass('ui-chat-reduced');
        this.element.addClass('ui-chat-expanded');
        this.element.find('.ui-chat-flags').show();
    },

    /**
     * Event callbacks
     */

    _handleHashTag: function(event) {
        var hashtag = event.metadata.hashtag.toLowerCase();
        if (this._state.hashtags[hashtag] == undefined) {
            this._addHashtag(hashtag);
            this._state.hashtags[hashtag] = 0;
            this._updateHashtags();
        }
    },

    _handleTweet: function(event) {
        var hashtags = event.metadata.hashtags.toLowerCase().split(',');
        var that = this;
        $.each(hashtags, function(i, hashtag) {
            var timestamp = event.datetime;
            var from = event.metadata.from;
            var text = event.metadata.text;
            that._addTweet(hashtag, timestamp, from, text);
            that._addTweet('all', timestamp, from, text);
            that._state.hashtags[hashtag] += 1;
        });
        this._updateHashtags();
    },

    _handleTranslation: function(event) {
        // Use the 'from' of the metadata as the from of the message
        event.from = event.metadata.from;

        this._handleMessage(event);
    },

    _handleMessage: function(event) {
        if (!event.metadata.lang || !event.metadata.text) {
            return;
        }

        var to = 'all';
        if (event.to) {
            to = (event.to == this.options.uceclient.uid) ? event.from : event.to;

            var that = this;
            $.each(this.options.langs, function(i, lang) {
                that._addConversation(to, lang);
            });
            this._state.roster[to].visible = true;
            this._updateRoster();
        }

        this._addChat(to,
                      event.metadata.lang,
                      event.datetime,
                      this._state.roster[event.from].nickname,
                      event.metadata.text);

        if (event.from != this.options.ucemeeting.uid) {
            this._trigger('updated', event);
        }
    },

    _handleJoin: function(event) {
        if (this._state.roster[event.from]) {
            return;
        }
        this._state.roster[event.from] = {uid: event.from, nickname:
                                          "Unnamed " + this._state.anonCounter,
                                          visible: false};
        this._state.anonCounter++;
        this._updateRoster();
    },

    _handleLeave: function(event) {
        delete this._state.roster[event.from];
        this._updateRoster();
    },

    _handleNicknameUpdate: function(event) {
        if (this._state.roster[event.from]) {
            this._state.roster[event.from].nickname = event.metadata.nickname;
            this._updateRoster();
        }
    },

    _handlePrivateChatStart: function(event) {
        var interlocutor = event.metadata.interlocutor;
        this._state.roster[interlocutor].visible = true;
        this._updateRoster();

        var that = this;
        $.each(this.options.langs, function(i, lang) {
            that._addConversation(interlocutor, lang);
        });
        this._showConversation(interlocutor, this.options.lang);
    },

    /**
     * Internal functions
     */

    _showConversation: function(name, language) {
        this._showContainer('conversation:' + name + ":" + language);
    },

    _showHashtag: function(name) {
        this._showContainer('hashtag:' + name);
    },

    _showContainer: function(name) {
        this._hideContainers();
        if (this.options.mode == "reduced") {
            this._hideSelectors();
        }
        this._containers
            .find('.ui-chat-container[name="' + name + '"]')
            .addClass('ui-chat-current');

        this._current = name;

        var conversationList = this._containers
            .find('.ui-chat-container[name="' + name + '"] ul.ui-chat-list');
        conversationList.scrollTop(conversationList[0].scrollHeight);
    },

    _hideSelectors: function() {
        this._selectors.allConversations.hide();
        this._selectors.conversations.hide();
        this._selectors.allHashtags.hide();
        this._selectors.hashtags.hide();
    },

    _showSelectors: function() {
        this._selectors.allConversations.show();
        this._selectors.conversations.show();
        this._selectors.allHashtags.show();
        this._selectors.hashtags.show();
    },

    _hideContainers: function() {
        $.each(this._containers.children(), function(i, container) {
            $(container).removeClass('ui-chat-current');
        });
    },

    _addConversation: function(name, language) {
        if (this._containers.find('.ui-chat-container[name="conversation:' + name + ':' + language + '"]').size() > 0) {
            return;
        }

        var conversation = this._addContainer('conversation:' + name + ":" + language);

        /* create form to send messages */
        var form = $('<form>')
            .attr({'action': '#', 'method': 'post', 'class': 'ui-chat-message-form'});

        var text = $('<input>').attr({'type': 'text', 'class': 'ui-chat-input'})
            .appendTo('<label>')
            .appendTo(form);

        $('<input>').attr({'type': 'submit', 'value': 'Post'})
            .appendTo(form);

        var that = this;
        form.submit(function(e) {
            var metadata = {text: text.val(), lang: language};
            if (name == "all") {
                that.options.ucemeeting.push("chat.message.new", metadata);
            } else {
                that.options.ucemeeting.pushTo(name, "chat.message.new", metadata);
            }
            text.val("");
            return false;
        });
        form.appendTo(conversation);
        conversation.appendTo(this._containers);
    },

    _addHashtag: function(name) {
        var hashtag = this._addContainer('hashtag:' + name);
        hashtag.appendTo(this._containers);
    },

    _addContainer: function(name) {
        var container = $('<li>')
            .attr({'class': 'ui-chat-container', 'name': name});

        var that = this;
        var back = $('<div>')
            .attr('class', 'ui-chat-container-back')
            .text('Back')
            .click(function(e) {
                that._hideContainers();
                that._showSelectors();
                that._current = undefined;
            });

        var list = $('<ul>')
            .attr({'class': 'ui-chat-list'});

        back.appendTo(container);
        list.appendTo(container);

        return (container);
    },

    _timestampToISO: function(timestamp) {
        var date = new Date(new Number(timestamp));
        var minutes = date.getMinutes();
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        var hours = date.getHours();
        hours = (hours < 10) ? "0" + hours : hours;
        var time = hours + ":" + minutes;
        var month = date.getMonth();
        month = (month < 10) ? "0" + month : month;
        var day = date.getDate();
        day = (day < 10) ? "0" + day : day;
        var datetime = date.getFullYear() + "-" + day + "-" + month + " " + hours + ":" + minutes;

        return datetime
    },

    _addChat: function(name, language, timestamp, from, text) {
        var datetime = this._timestampToISO(timestamp);
        this._addMessage('conversation:' + name + ":" + language, datetime, from, text);
    },

    _addTweet: function(hashtag, timestamp, from, text) {
        var datetime = this._timestampToISO(timestamp);
        this._addMessage('hashtag:' + hashtag, datetime, from, text);
    },

    _addMessage: function(name, datetime, from, text) {
        var conversationList = this.element
            .find('.ui-chat-container[name="' + name + '"] ul.ui-chat-list');
        var message = $('<li>')
            .attr('class', 'ui-chat-message');
        var date = $('<span>')
            .attr('class', 'ui-chat-message-date')
            .text(datetime)
            .appendTo(message);
        var from = $('<span>')
            .attr('class', 'ui-chat-message-from')
            .text(from)
            .appendTo(message);
        var text = $('<span>')
            .attr('class', 'ui-chat-message-text')
            .text(text)
            .appendTo(message);

        // Change http URIs into links
        var httpLinks = /(https?:\/\/[^ \)\"]+)/g;
        text.html(text.html().replace(httpLinks, '<a href="$1">$1</a>'));

        message.appendTo(conversationList);
        conversationList.scrollTop(conversationList[0].scrollHeight);
    },

    _updateRoster: function() {
        this._selectors.conversations.empty();

        var that = this;
        $.each(this._state.roster, function(uid, user) {
            if (user.visible == false) {
                return;
            }
            var userSelector = $('<span>')
                .text(user.nickname)
                .attr('class', 'ui-chat ui-selector-text');
            var closeButton = $('<span>')
                .attr('class', 'ui-chat ui-selector-button ui-button-close')
                .attr('href', '#')
                .button({
                    text: false,
                    icons: {
                        primary: "ui-icon-circle-close"
                    }
                })
                .bind('click', function() {
                    that._state.roster[uid].visible = false;
                    that._updateRoster();

                    if (that.options.mode == "expanded") {
                        that._showConversation("all", that.options.lang);
                    }
                })
            $('<li>')
                .click(function() {
                    that._showConversation(uid, that.options.lang);
                })
                .append(userSelector)
                .append(closeButton)
                .appendTo(that._selectors.conversations);
        });
    },

    _updateHashtags: function() {
        this._selectors.hashtags.empty();

        var orderedHashtags = [];
        $.each(this._state.hashtags, function(hashtag) {
            orderedHashtags.push(hashtag);
        });
        orderedHashtags.sort();

        var that = this;
        $.each(orderedHashtags, function(i, value) {
            var hashtag = $('<li>').text(value + " (" + that._state.hashtags[value] + ")");
            hashtag.click(function(e) {
                that._showHashtag(value);
            });
            hashtag.appendTo(that._selectors.hashtags);
        });
    },

    setOption: function(key, value) {
        $.Widget.prototype._setOption.apply(this, arguments);
    },

    destroy: function() {
        this.element.find('*').remove();
        this.element.removeClass('ui-chat ui-widget');
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }
};
$.uce.widget("chat", new $.uce.Chat());
