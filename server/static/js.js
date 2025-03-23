/**
 * Created by Yc on 2016/5/17.
 */

var canvas = document.getElementsByTagName('canvas')[0],
    ctx = canvas.getContext('2d'),
    msg = document.getElementById('msg'),
    ranger = document.getElementById('ranger'),
    colors = document.getElementById('colors');

var input = document.getElementById('input-msg');
var socket = io.connect();
socket.on('server msg',function (data) {
    var ele = document.createElement('p');
    ele.innerHTML = data;
    msg.appendChild(ele);
    msg.scrollTop = msg.scrollHeight;
})
socket.on('login',function () {
    socket.emit('login',prompt('输入你的姓名'));
});

socket.on('paint paths',function (paths) {
    paths = JSON.parse(paths)
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var k in paths)
        Ctl.drawPts(ctx, paths[k]);
})
socket.on('paint pts',function (pts) {
    //canvas.paths = paths;
    pts = JSON.parse(pts)
    if(!pts) return;
    Ctl.drawPts(ctx, pts);
});
socket.on('cmd',function (data) {
    console.log(JSON.parse(data));
})

window.onload = function () {
    Ctl.init();
    function resize() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.paths = canvas.pts = [];
        socket.emit('repaint');
    }
    this.addEventListener('resize',resize);
    resize();
    input.onkeydown = function (e) {
        if(e.keyCode === 13 && this.value!=''){
            socket.emit('client msg',this.value);
            this.value = '';
        }
    }
}

function bind(ele,type,fn) {
    fn = fn.bind(ele);
    ele[type] = fn;
    ele.addEventListener(type,fn);
}
bind(canvas,'mousemove',function (e) {
    if(e.buttons === 1) {
        var x = e.offsetX, y = e.offsetY;
        if(e.ctrlKey){
            this.classList.add('movable');
            if(this.mouseDown)
                socket.emit('move my paint',x-this.mouseDown.x,y-this.mouseDown.y);
            this.mouseDown={x:e.offsetX,y:e.offsetY};
        }else {
            Ctl.addPos(x, y);
            Ctl.drawPts(ctx, this.pts);
            socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}))
        }
    }
});
// bind(canvas,'touchstart',function (e) {
//     var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY;
//     Ctl.addPos(x, y);
//     Ctl.drawPts(ctx, this.pts);
//     socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}))
// })
// bind(canvas,'touchmove',function (e) {
//     var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY;
//     Ctl.addPos(x, y);
//     Ctl.drawPts(ctx, this.pts);
//     socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}))
// })
// bind(canvas,'touchend',function (e) {
//     var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY;
//     Ctl.addPos(x, y);
//     Ctl.addPath(this.pts);
//     socket.emit('paint',JSON.stringify({data:new Path(this.pts),status:'end'}))
//     Ctl.clearPos();
// })
bind(canvas,'mouseup',function (e) {
    this.classList.remove('movable');
    if(!this.mouseDown) {
        var x = e.offsetX, y = e.offsetY;
        Ctl.addPos(x, y);
    }
    Ctl.addPath(this.pts);
    socket.emit('paint',JSON.stringify({data:new Path(this.pts),status:'end'}))
    Ctl.clearPos();
    delete this.mouseDown;
})

bind(canvas,'mousedown',function (e) {
    var x = e.offsetX,y = e.offsetY;
    this.mouseDown={x:e.offsetX,y:e.offsetY};
    Ctl.clearPos();
    Ctl.addPos(x,y);
});
colors.addEventListener('click',function (e) {
    var t = e.target;
    if(t.classList.contains('rect')){
        Array.prototype.slice.call(this.getElementsByClassName('active'))
            .forEach(v=>v.classList.remove('active'));
        t.classList.add('active');
        Ctl.setColor(t.style.backgroundColor);
    }
});
ranger.addEventListener('change',function (e) {
    this.nextElementSibling.innerText = this.value;
    Ctl.setLw(this.value);
});

// Controller
Ctl = {
    drawPts: function (ctx,pts) {
        if(pts instanceof Path || pts.pts){
            var color = pts.color,lw = pts.lw;
            pts = pts.pts;
        }
        var p1 = pts[0];
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        pts.slice(1).forEach(v=>{
            ctx.lineTo(v.x,v.y);
        });
        ctx.lineWidth = lw || canvas.lw
        ctx.strokeStyle = color || canvas.color;
        ctx.stroke();
        ctx.restore();
    },
    init : function () {
        canvas.paths=[];
        canvas.pts=[];
        canvas.color = 'black';
        canvas.lw = 1;
        // 定义20个常用颜色
        var colorsList = [
            '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', // 七种彩虹颜色
            '#FFC0CB', '#FFA500', '#FFFF99', '#00FFFF', '#ADD8E6', '#FFB6C1', '#FFD700', // 其他常用颜色
            '#800000', '#808000', '#008000', '#008080', '#000080', '#800080' // 其他常用颜色
        ];
        // 添加颜色
        for (var i = 0; i < colorsList.length; i++) {
            this.addColor(colorsList[i]);
        }
        this.addColor('#FFFFFF'); // 添加白色
        this.addColor('#000000', true); // 添加白色
    },
    setLw(lw){
        canvas.lw = lw;
    },
    setColor(c){
        canvas.color = c;
    },
    addPath : function (pts) {
        canvas.paths.push(new Path(pts,canvas.lw,canvas.color));
    },
    addPos : function (x,y) {
        canvas.pts.push(new Pos(x,y));
    },
    clearPos : function () {
        canvas.pts = []
    },
    addColor : function (color, active) {
        var rect = document.createElement('div');
        rect.className = 'rect';
        if (active) {
            rect.className += ' active'; // 如果是白色，添加active类
        }
        rect.style.backgroundColor = color;
        colors.appendChild(rect);
    },
    random : function (b) {
        return Math.floor(Math.random()*b);
    }
};

// webSocket
/*
var ws = WS({
    path:'ws',
    onOpen:function (e) {
        alert('OK');
    },
    onError:function (e) {
        // alert(e.message)
        alert('Error');
    },
    onReceive:function (data,t) {

    },
    onClose:function (e) {
        alert('Close');
    }
});*/



// model

function Pos(x,y) {
    this.x=x;this.y=y;
}

function Path(pts,lw,color) {
    this.pts = pts;
    this.lw = lw || canvas.lw;
    this.color = color || canvas.color;
}

