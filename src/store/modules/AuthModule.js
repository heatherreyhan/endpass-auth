import { Action, VuexModule, Module, Mutation } from 'vuex-class-modules';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import ConnectError from '@endpass/connect/error';
import identityService from '@/service/identity';
import settingsService from '@/service/settings';
import authService from '@/service/auth';
import modeService from '@/service/mode';
import bridgeMessenger from '@/class/singleton/bridgeMessenger';
import i18n from '@/locales/i18n';
import { authChannel } from '@/class/singleton/channels';
import Answer from '@/class/Answer';
import { METHODS, CHALLENGE_TYPES, AUTH_STATUS_CODE } from '@/constants';
import CookieExpireChecker from '@/class/CookieExpireChecker';
import NonReactive from '@/class/NonReactive';

const { ERRORS } = ConnectError;

const STATUS_TO_CODE = {
  DEFAULT: 401,
  [AUTH_STATUS_CODE.LOGGED_IN]: 200,
  [AUTH_STATUS_CODE.NOT_LOGGED]: 401,
  [AUTH_STATUS_CODE.NEED_PERMISSION]: 403,
  [AUTH_STATUS_CODE.LOGOUT]: 400,
};

@Module({ generateMutationSetters: true })
class AuthModule extends VuexModule {
  authParams = null;

  cookieExpireChecker = new NonReactive(new CookieExpireChecker());

  /** @type {CHALLENGE_TYPES[keyof CHALLENGE_TYPES]?} */
  challengeType = null;

  isLogin = false;

  isPermission = false;

  constructor(props, { sharedStore }) {
    super(props);
    this.sharedStore = sharedStore;
  }

  get isOtp() {
    return this.challengeType === CHALLENGE_TYPES.OTP;
  }

  get isAuthorized() {
    return this.isLogin && this.isPermission;
  }

  @Action
  async loadAuthChallenge({ email }) {
    const request = authService.getAuthChallenge(email);

    await this.handleAuthRequest({
      request,
    });
  }

  @Action
  async authWithGoogle({ idToken }) {
    const request = authService.authWithGoogle(idToken);

    await this.handleAuthRequest({
      request,
    });
  }

  @Action
  async authWithGitHub(code) {
    this.sharedStore.changeLoadingStatus(true);

    try {
      const res = await authService.authWithGitHub(code);

      if (!res.success) {
        throw new Error(res.message || i18n.t('store.auth.authFailed'));
      }

      settingsService.clearLocalSettings();

      this.challengeType = get(res, 'challenge.challengeType');
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    } finally {
      this.sharedStore.changeLoadingStatus(false);
    }
  }

  @Action
  async handleAuthRequest({ request }) {
    this.sharedStore.changeLoadingStatus(true);

    try {
      const res = await request;

      if (!res.success) throw new Error(i18n.t('store.auth.authFailed'));

      settingsService.clearLocalSettings();

      this.challengeType = get(res, 'challenge.challengeType');
    } finally {
      this.sharedStore.changeLoadingStatus(false);
    }
  }

  @Action
  async sendCode({ email }) {
    await authService.sendEmailCode(email);
  }

  @Action
  async resetRegularPassword({ email }) {
    await identityService.resetRegularPassword({ email });
  }

  @Action
  async confirmResetRegularPassword({ code, password }) {
    await identityService.confirmResetRegularPassword({ code, password });
  }

  @Action
  confirmAuth(serverMode) {
    authChannel.put(Answer.createOk(serverMode));
  }

  @Action
  cancelAuth() {
    authChannel.put(
      Answer.createFail(
        ERRORS.AUTH_CANCELED_BY_USER,
        i18n.t('store.auth.authCanceled'),
      ),
    );
  }

  /**
   * Disable otp mode
   */
  @Action
  async disableOtpInStore() {
    this.challengeType = CHALLENGE_TYPES.PASSWORD;
  }

  @Action
  async checkRegularPassword(email) {
    return identityService.checkRegularPassword(email);
  }

  @Action
  async validateCustomServer(serverUrl) {
    return modeService.validateIdentityServer(serverUrl);
  }

  @Action
  async waitLogin() {
    await authService.waitLogin();
    await this.defineAuthStatus();
  }

  @Action
  async defineAuthStatus() {
    const { status, hash, expiresAt } = await authService.getAuthStatus();

    const settings = settingsService.getLocalSettings();

    if (status !== AUTH_STATUS_CODE.LOGGED_IN && !isEmpty(settings)) {
      settingsService.clearLocalSettings();
    }

    await this.changeAuthByStatus({ status, hash });

    if (this.isAuthorized && expiresAt) {
      this.cookieExpireChecker.value.setExpireAt(expiresAt);
      this.cookieExpireChecker.value.startChecking();
    }
  }

  @Mutation
  updateAuthStateByStatus(status) {
    this.isLogin =
      status === AUTH_STATUS_CODE.NEED_PERMISSION ||
      status === AUTH_STATUS_CODE.LOGGED_IN;
    this.isPermission = status === AUTH_STATUS_CODE.LOGGED_IN;
  }

  @Action
  changeAuthByStatus({ status, hash }) {
    this.updateAuthStateByStatus(status);
    const isAuthorizedNew = this.isAuthorized;

    const code = STATUS_TO_CODE[status] || STATUS_TO_CODE.DEFAULT;

    bridgeMessenger.send(METHODS.AUTH_STATUS, {
      status: isAuthorizedNew,
      code,
      hash,
    });
  }

  @Mutation
  setAuthParams(params) {
    this.authParams = params;
  }

  @Action
  logout() {
    this.cookieExpireChecker.value.setExpireAt(0);
    this.cookieExpireChecker.value.stopChecking();
    this.changeAuthByStatus({ status: AUTH_STATUS_CODE.LOGOUT, hash: '' });
    this.challengeType = null;
    this.setAuthParams(null);
    settingsService.clearLocalSettings();
  }
}

export default AuthModule;
