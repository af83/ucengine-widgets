var Factories = {
    createStreamNew: function() {
        return {type: "video.stream.new",
                metadata : {token : "123456",
                            channel : "channel_1"}};
    },
    createStreamStart: function(broadcaster) {
        return {type: "video.stream.start",
                metadata: {broadcaster: broadcaster}}
    },
    createStreamStop: function(broadcaster) {
        return {type: "video.stream.stop",
                metadata: {broadcaster: broadcaster}}
    },
    createFileEvent: function(params) {
        params = params || {}

        var metadata = $.extend({}, {id : 'norris.pdf',
                                     name : 'norris.pdf'}, params);
        var eventId = params['eventId'] || "upload_event_id";
        var from = params['from'] || "test_user";

        return {
            id: eventId,
            from: from,
            type: "internal.file.add",
            metadata: metadata
        };
    },
    createConversionDoneEvent: function(params) {
        var metadata = {};

        $(params.pages).each(function(index, page) {
            metadata[index] = page;
        });

        return {
            type: "document.conversion.done",
            parent: params.parent,
            metadata: metadata
        };
    },
    createDocumentShareStartEvent: function(params) {
        var from = params['from'] || "chuck";
        var metadata = {id: params.id};

        if (params.page) {
            metadata.page = params.page;
        }
        return {
            type: "document.share.start",
            from: from,
            metadata: metadata
        };
    },
    createDocumentShareGotoEvent: function(params) {
        var from = params['from'] || "chuck";
        return {
            type: "document.share.goto",
            from: from,
            metadata: {
                page: params.page
            }
        };
    },
    createDocumentShareStopEvent: function(params) {
        var from = params['from'] || "chuck";
        return {
            type: "document.share.stop",
            from: from,
            metadata: {
                id: params.id
            }
        };
    },
}