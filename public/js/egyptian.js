//manage rdd
const egypt = {
    description: "manage localStorage.history",
    initd:0,
    defaultRange:30,
    lsmm:0,
    setup: function (range = 7) {
        let obj = {};
        let date = new Date();
        for(var i=0 ; i<range ; i++) {
            obj["d"+(date.getMonth()+1)+"/"+(date.getDate())] = {};
            date.setDate(date.getDate()-1);
        }
        return obj;
    },
    sync: function (cmpObj, range = 7) {
        let a = egypt.setup(range);
        let a1 = Object.keys(a);
        let b = JSON.parse(cmpObj);

        jQuery.each(b, function (key, value) {
            a1.indexOf(key) !== -1 ? a[key] = value : null;
        });
        return a;
    },
    increase2: function(request) {
        let today = todaykey();
        let history = this.lsmm.get('history');
        if(!history.value[today]) history.value[today] = {};
        if(!history.value[today][request.id]) history.value[today][request.id] = {"name":request.name,"view":0,"reply":0,"write":0};
        history.value[today][request.id][request.flag]++;
        localStorage[history.key] = JSON.stringify(history.value);
        return this;
    },
    todaykey: function () {
        let q = new Date();
        return "d"+(q.getMonth()+1)+"/"+q.getDate();
    },
    groupByDay: function () {
        let history = this.lsmm.get('history');
        let o = {};
        $.each(history.value, function (date, gall_ids) {
            if(!o[date]) o[date] = {"view":0, "reply":0, "write":0};
            $.each(gall_ids, function (id, value) {
                o[date].view += value.view;
                o[date].write += value.write;
                o[date].reply += value.reply;
            });
        });
        //console.log('sum by day');
        //console.log(o);
        return o;
    },
    groupByGall: function () {
        let history = this.lsmm.get('history');
        let o = {};
        console.log(history);
        $.each(history.value, function (date, gall_ids) {
            //console.log(o);
            $.each(gall_ids, function (id, value) {
                if(!o[id]) o[id] = {"name":"", "view":0, "reply":0, "write":0};
                if(o[id].name == "") o[id].name = value.name;
                o[id].view += value.view;
                o[id].write += value.write;
                o[id].reply += value.reply;
            })
        });
        return o;
    },
    clear: function () {
        localStorage["history"] = JSON.stringify(egypt.setup(30));
    },
    init: function () {
        this.lsmm = new LS();
        if(egypt.initd === 0) egypt.initd = 1;
        let rd2 = localStorage["history"] ? localStorage["history"] : localStorage["history"] = JSON.stringify(egypt.setup(15));
        localStorage["history"] = JSON.stringify(egypt.sync(rd2,30));
    }
};

egypt.init();
