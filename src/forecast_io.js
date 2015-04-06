/* jshint esnext:true */

const WEATHER_URL_HOST = 'api.forecast.io';
const WEATHER_URL_BASE = 'http://' + WEATHER_URL_HOST + '/forecast/';

function getWeatherIcon(icon) {
    //    clear-day             weather-clear-day
    //    clear-night           weather-clear-night
    //    rain                  weather-showers
    //    snow                  weather-snow
    //    sleet                 weather-snow
    //    wind                  weather-storm
    //    fog                   weather-fog
    //    cloudy                weather-overcast
    //    partly-cloudy-day     weather-few-clouds
    //    partly-cloudy-night   weather-few-clouds-night
    let iconname = ['weather-severe-alert'];
    switch (icon) {
        case 'wind':
            iconname = ['weather-storm'];
            break;
        case 'rain':
            iconname = ['weather-showers-scattered', 'weather-showers'];
            break;
        case 'sleet':
        case 'snow':
            iconname = ['weather-snow'];
            break;
        case 'fog':
            iconname = ['weather-fog'];
            break;
        case 'clear-day': //sky is clear
            iconname = ['weather-clear'];
            break;
        case 'clear-night': //sky is clear
            iconname = ['weather-clear-night'];
            break;
        case 'partly-cloudy-day':
            iconname = ['weather-few-clouds'];
            break;
        case 'partly-cloudy-night':
            iconname = ['weather-few-clouds-night'];
            break;
        case 'cloudy':
            iconname = ['weather-overcast'];
            break;
    }
    for (let i = 0; i < iconname.length; i++) {
            if (this.hasIcon(iconname[i]))
            return iconname[i] + this.getIconType();
    }
    return 'weather-severe-alert' + this.getIconType();
}

function parseWeatherCurrent() {
    if (this.currentWeatherCache === undefined) {
            this.refreshWeatherCurrent();
        return;
    }

    this.checkPositionInPanel();

    let json = this.currentWeatherCache;

    this.owmCityId = 0;
    // Refresh current weather
    let location = this.extractLocation(this._city);

    let comment = json.summary;

    let temperature = this.formatTemperature(json.temperature);

    let now = new Date();

    let iconname = this.getWeatherIcon(json.icon);

    if (this.lastBuildId === undefined)
        this.lastBuildId = 0;

    if (this.lastBuildDate === undefined)
        this.lastBuildDate = 0;

    if (this.lastBuildId != json.time || !this.lastBuildDate) {
        this.lastBuildId = json.time;
        this.lastBuildDate = new Date(this.lastBuildId * 1000);
    }

    let lastBuild = '-';

    if (this._clockFormat == "24h")
        lastBuild = this.lastBuildDate.toLocaleFormat("%R");
    else
        lastBuild = this.lastBuildDate.toLocaleFormat("%I:%M %p");

    let beginOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    let d = Math.floor((this.lastBuildDate.getTime() - beginOfDay.getTime()) / 86400000);
    if (d < 0) {
        lastBuild = _("Yesterday");
        if (d < -1)
            lastBuild = _("%d days ago").format(-1 * d);
    }

    this._currentWeatherIcon.icon_name = this._weatherIcon.icon_name = iconname;

    let weatherInfoC = "";
    let weatherInfoT = "";
    if (this._comment_in_panel)
        weatherInfoC = comment;

    if (this._text_in_panel)
        weatherInfoT = temperature;

    this._weatherInfo.text = weatherInfoC + ((weatherInfoC && weatherInfoT) ? ", " : "") + weatherInfoT;

    this._currentWeatherSummary.text = comment + ", " + temperature;
    this._currentWeatherLocation.text = location;
    this._currentWeatherCloudiness.text = parseInt(json.cloudCover * 100) + ' %';
    this._currentWeatherHumidity.text = parseInt(json.humidity * 100) + ' %';
    this._currentWeatherPressure.text = this.formatPressure(json.pressure);

    this._currentWeatherBuild.text = lastBuild;

    this._currentWeatherWind.text = this.formatWind(json.windSpeed, this.getWindDirection(json.windBearing));

    this.parseWeatherForecast();
    this.recalcLayout();
}

function refreshWeatherCurrent() {
    this.oldLocation = this.extractCoord(this._city);

    let params = {
        exclude: 'minutely,hourly,alerts,flags',
        lang: this.fc_locale,
        units: 'si'
    };
    let url = WEATHER_URL_BASE + this._appid_fc + '/' + this.oldLocation;
    this.load_json_async(url, params, function(json) {
        if (json && json.currently) {

            if (this.currentWeatherCache != json.currently)
                this.currentWeatherCache = json.currently;

            if (json.daily && json.daily.data) {
                if (this.forecastWeatherCache != json.daily.data)
                    this.forecastWeatherCache = json.daily.data;
            }

            this.rebuildSelectCityItem();

            this.parseWeatherCurrent();
        } else {
            this.reloadWeatherCurrent(600);
        }
    });
    this.reloadWeatherCurrent(this._refresh_interval_current);
}

function parseWeatherForecast() {
    if (this.forecastWeatherCache === undefined) {
        this.refreshWeatherCurrent();
        return;
    }

    let forecast = this.forecastWeatherCache;
    let beginOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    let cnt = Math.min(this._days_forecast, forecast.length);
    if (cnt != this._days_forecast)
        this.rebuildFutureWeatherUi(cnt);

    // Refresh forecast
    for (let i = 0; i < cnt; i++) {
        let forecastUi = this._forecast[i];
        let forecastData = forecast[i];
        if (forecastData === undefined)
            continue;

        let t_low = this.formatTemperature(forecastData.temperatureMin);
        let t_high = this.formatTemperature(forecastData.temperatureMax);


        let comment = forecastData.summary;
        let forecastDate = new Date(forecastData.time * 1000);
        let dayLeft = Math.floor((forecastDate.getTime() - beginOfDay.getTime()) / 86400000);

        let date_string = _("Today");

        let sunrise = new Date(forecastData.sunriseTime * 1000);
        let sunset = new Date(forecastData.sunsetTime * 1000);

        if (dayLeft === 0) {
            if (this._clockFormat == "24h") {
                sunrise = sunrise.toLocaleFormat("%R");
                sunset = sunset.toLocaleFormat("%R");
            } else {
                sunrise = sunrise.toLocaleFormat("%I:%M %p");
                sunset = sunset.toLocaleFormat("%I:%M %p");
            }
            this._currentWeatherSunrise.text = sunrise;
            this._currentWeatherSunset.text = sunset;
        } else if (dayLeft == 1)
            date_string = _("Tomorrow");
        else if (dayLeft > 1)
            date_string = _("In %d days").format(dayLeft);
        else if (dayLeft == -1)
            date_string = _("Yesterday");
        else if (dayLeft < -1)
            date_string = _("%d days ago").format(-1 * dayLeft);

        forecastUi.Day.text = date_string + ' (' + this.getLocaleDay(forecastDate.getDay()) + ')\n' + forecastDate.toLocaleDateString();
        forecastUi.Temperature.text = '\u2193 ' + t_low + '    \u2191 ' + t_high;
        forecastUi.Summary.text = comment;
            forecastUi.Icon.icon_name = this.getWeatherIcon(forecastData.icon);
        }
}
