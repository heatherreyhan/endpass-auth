import { VuexModule, Action, Module } from 'vuex-class-modules';
import createController from '@/controllers/createController';
import { authStore as authStoreModule } from '@/store';
import authService from '@/service/auth';

@Module({ generateMutationSetters: true })
class AuthController extends VuexModule {
  constructor(props, { authStore = authStoreModule }) {
    super(props);
    this.authStore = authStore;
  }

  /**
   * @param {boolean} isSignUp
   * @param {string} email
   * @param {string} password
   * @param {string} code
   * @param {boolean} isRemember
   * @return {Promise<void>}
   */
  @Action
  async authWithCode({ isSignUp, email, password, code, isRemember }) {
    await authService.authWithCode({
      email,
      code,
      password,
      isSignUp,
      isRemember,
    });
    await this.authStore.defineAuthStatus();
  }
}

export default () => createController(AuthController);
