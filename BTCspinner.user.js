// ==UserScript==
// @name            BTCspinner Glitch
// @namespace       Avalerion
// @description     BTCspinner.io Glitch.
// @require         https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @include         *://btcspinner.io/game
// @version         1.1
// ==/UserScript==

var game = null;

function BTCspinner()
{
    var spinner = null;
    var balance = 0;
    var speed = 0;
    var rotations = 0;
    var totalSpeed = 0;
    var totalRotations = 0;
    var avgSpeed = 0;
    var maxSpeed = 0;
    var d = false;
    var startTime = 0;
    var socket_ = null;
    var interval = null;
    var storage = [];
    var delay = 1000;

    function initValues()
    {
        balance = 0;
        speed = 0;
        rotations = 0;
        totalSpeed = 0;
        totalRotations = 0;
        avgSpeed = 0;
        maxSpeed = 0;
        d = false;
        startTime = 0;
        $('#maxspeed').html(maxSpeed.toFixed());
    }

    function updateSpeed()
    {
        var rpm = ((speed * 60) / 360) * 60;
        totalSpeed += rpm;
        avgSpeed = (rotations > 0) ? totalSpeed / rotations : 0;
        totalRotations = (totalSpeed / 360) / 10;
        if (rpm > maxSpeed)
        {
            maxSpeed = rpm;
            $('#maxspeed').html(maxSpeed.toFixed());
        }
        $('#speed').html(d ? 'Dragging ;)' : rpm.toFixed());
        $('#avgspeed').html(avgSpeed.toFixed());
    }

    function updateBalance()
    {
        var time = Date.now() - startTime;
        var btcpm = (balance / time) * 1000 * 60;
        var btcpr = (totalRotations > 0) ? balance / totalRotations : 0;

        $('#earned').html(balance.toFixed(15));
        $('#btcpm').html(btcpm.toFixed(15));
        $('#btcpr').html(btcpr.toFixed(15));
    }

    function setupSpinner(socket) {
        unblurSpinner();
        startTime = Date.now();
        spinner = new Propeller('.spinner', {
            inertia: 0.998,
            speed: 170,
            minimalSpeed: 0.01,
            onRotate: function () {
                if (this.speed < 50) {this.speed = Math.floor((Math.random() * 170) + 1);  }
                storage.push({d: d, s: this.speed});
                speed = Math.abs(this.speed);
                rotations++;
                updateSpeed();
            },
            onStop: function () {
                speed = Math.abs(this.speed);
                updateSpeed();
            },
            onDragStart: function () {
                d = true;
                speed = Math.abs(this.speed);
                updateSpeed();
            },
            onDragStop: function () {
                d = false;
                speed = Math.abs(this.speed);
                updateSpeed();
            }
        });
        interval = setInterval(function () {
            if (storage.length == 0)
                return;

            socket.emit('rotate', storage);
            storage = [];
        }, delay);
    }

    function unblurSpinner() {
        $({blurRadius: 20}).animate({blurRadius: 0}, {
            duration: 750,
            easing: 'linear',
            step: function () {
                $('#blur').css({
                    "-webkit-filter": "blur("+this.blurRadius+"px)",
                    "filter": "blur("+this.blurRadius+"px)"
                });
            },
            complete: function () {
                $('#blur').css({
                    "-webkit-filter": "blur(0px)",
                    "filter": "blur(0px)"
                });
            }
        });
    }

    function blurSpinner() {
        $({blurRadius: 0}).animate({blurRadius: 20}, {
            duration: 500,
            easing: 'linear',
            step: function () {
                $('#blur').css({
                    "-webkit-filter": "blur("+this.blurRadius+"px)",
                    "filter": "blur("+this.blurRadius+"px)"
                });
            },
            complete: function () {
                $('#blur').css({
                    "-webkit-filter": "blur(20px)",
                    "filter": "blur(20px)"
                });
            }
        });
    }

    function showAds() {

    }

    this.setupSocket = function(data) {
        if (!data.error)
        {
            var socket = io(HOST+':'+PORT);
            socket_ = socket;

            socket.on('adinplay', function () {
                showAds();
            });
            socket.on('accepted', function (value) {
                balance = value;
                updateBalance();
            });
            socket.on('validToken', function (key) {
                setupSpinner(socket);
            });
            socket.on('verification', function () {
                $('#recaptchaModal').modal('show');
                grecaptcha.reset();
                spinner.unbind();
                spinner.stop();
            });
            socket.on('verificated', function () {
                $('#recaptchaModal').modal('hide');
                spinner.bind();
            });
            socket.on('disconnect', function () {
                spinner.unbind();
                spinner.stop();
                spinner = null;
                blurSpinner();
            });

            socket.on('connect', function () {
                initValues();
                updateBalance();
                updateSpeed();
                socket.emit('checkToken', data.token);
            });
        }
    }

    this.recaptchaCallback = function (response) {
        socket_.emit('recaptcha', response);
    }
};

function recaptchaCallback(response)
{
    game.recaptchaCallback(response);
}

$(document).ready(function () {
    game = new BTCspinner();

    $.ajax({
        url: '/userapi/getToken',
        success: game.setupSocket,
        dataType: 'json'
    });
});


