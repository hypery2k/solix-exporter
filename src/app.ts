/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { LoginResultResponse, SolixApi } from './api';
import { anonymizeConfig, getConfig } from './config';
import { consoleLogger } from './logger';
import { sleep } from './utils';
import { FilePersistence, Persistence } from './persistence';
import express, { Express, Request, Response } from 'express';
const app: Express = express();

const config = getConfig();
const logger = consoleLogger(config.verbose);
const port = config.httpPort;
const device = config.deviceSn;

const devices: any = {};

function isLoginValid(loginData: LoginResultResponse, now: Date = new Date()) {
  return new Date(loginData.token_expires_at * 1000).getTime() > now.getTime();
}

function restService() {
  app.get('/', (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const deviceInfo: any = devices[device];
    if (deviceInfo) {
      const response = `
# HELP solar_now_p current watt of solar
# TYPE solar_now_p gauge
solar_now_p ${Math.round(<number>deviceInfo.solar_total)}
# HELP solar_now_bat current power of battery (percentage, 0-1)
# TYPE solar_now_bat gauge
solar_now_bat ${Math.round(<number>deviceInfo.bat_soc)}
# HELP solar_now_bat_charge_p current power for charging in watt
# TYPE solar_now_bat_charge_p gauge
solar_now_bat_charge_p ${Math.round(<number>deviceInfo.battery_charge)}
# HELP solar_now_bat_discharge_p current power for discharging in watt
# TYPE solar_now_bat_discharge_p gauge
solar_now_bat_discharge_p ${Math.round(<number>deviceInfo.battery_discharge)}
# HELP solar_now_grid current watt to grid
# TYPE solar_now_grid gauge
solar_now_grid ${Math.round(<number>deviceInfo.to_home)}
`;
      res.send(response);
    } else {
      res.send('No data available');
    }
  });

  app.listen(port, () => {
    console.log(`Exporter listening on port ${port}`);
  });
}

async function run(): Promise<void> {
  logger.log(JSON.stringify(anonymizeConfig(config)));
  const api = new SolixApi({
    username: config.username,
    password: config.password,
    country: config.country,
    logger,
  });

  const persistence: Persistence<LoginResultResponse> = new FilePersistence(
    config.loginStore,
  );

  async function fetchAndPublish(): Promise<void> {
    logger.log('Fetching data');
    let loginData = await persistence.retrieve();
    if (loginData == null || !isLoginValid(loginData)) {
      const loginResponse = await api.login();
      loginData = loginResponse.data ?? null;
      if (loginData) {
        await persistence.store(loginData);
      } else {
        logger.error(
          `Could not log in: ${loginResponse.msg} (${loginResponse.code})`,
        );
      }
    } else {
      logger.log('Using cached auth data');
    }
    if (loginData) {
      const loggedInApi = api.withLogin(loginData);
      const siteHomepage = await loggedInApi.siteHomepage();

      let sites;
      if (siteHomepage.data.site_list.length === 0) {
        // Fallback for Shared Accounts
        sites = (await loggedInApi.getSiteList()).data.site_list;
      } else {
        sites = siteHomepage.data.site_list;
      }
      let deviceList = await loggedInApi.getRelateAndBindDevices();
      console.debug('deviceList', deviceList);

      for (const site of sites) {
        const scenInfo = await loggedInApi.scenInfo(site.site_id);
        const deviceSn =
          scenInfo.data.solarbank_info.solarbank_list[0].device_sn;
        console.log(`Logging for device ${deviceSn}`, scenInfo);
        const energyAnalysis = await loggedInApi.energyAnalysis({
          siteId: site.site_id,
          deviceSn: device,
          type: 'day',
        });
        console.debug('energyAnalysis', energyAnalysis);
        console.debug('scenInfo', scenInfo);
        devices[scenInfo.data.solarbank_info.solarbank_list[0].device_sn] = {
          solar_pv1: Number(scenInfo.data.solarbank_info.solar_power_1),
          solar_pv2: Number(scenInfo.data.solarbank_info.solar_power_2),
          solar_pv3: Number(scenInfo.data.solarbank_info.solar_power_3),
          solar_pv4: Number(scenInfo.data.solarbank_info.solar_power_4),
          solar_total: Number(
            scenInfo.data.solarbank_info.solarbank_list[0].photovoltaic_power,
          ),
          bat_soc: Number(
            scenInfo.data.solarbank_info.solarbank_list[0].battery_power,
          ),
          battery_charge: Number(
            scenInfo.data.solarbank_info.solarbank_list[0].charging_power,
          ),
          battery_discharge: Number(
            scenInfo.data.solarbank_info.battery_discharge_power,
          ),
          to_home: Number(scenInfo.data.solarbank_info.total_output_power),
        };
        deviceList = await loggedInApi.getRelateAndBindDevices();
        console.log(
          'Current device stats',
          devices[scenInfo.data.solarbank_info.solarbank_list[0].device_sn],
        );
      }
      logger.log('Published.');
    } else {
      logger.error('Not logged in');
    }
  }

  for (;;) {
    const start = new Date().getTime();
    try {
      await fetchAndPublish();
    } catch (e) {
      logger.warn('Failed fetching or publishing printer data', e);
    }
    const end = new Date().getTime() - start;
    const sleepInterval = config.pollInterval * 1000 - end;
    logger.log(`Sleeping for ${sleepInterval}ms...`);
    await sleep(sleepInterval);
  }
}

run()
  .then(() => {
    logger.log('Done');
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

restService();
