import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { email } from '@unitFixtures/auth';
import SignInInteractor from '@/components/screens/Authenticator/modules/SignIn/SignIn.interactor';
import SignInView from '@/components/screens/Authenticator/modules/SignIn/SignIn.view';
import setupI18n from '@/locales/i18nSetup';
import authService from '@/service/auth';
import identityService from '@/service/identity';
import { IDENTITY_MODE } from '@/constants';

const localVue = createLocalVue();
localVue.use(Vuex);
const i18n = setupI18n(localVue);

describe('SignInInteractor', () => {
  let wrapper;
  const createWrapper = (options, props) =>
    shallowMount(SignInInteractor, {
      localVue,
      propsData: {
        email,
        ...props,
      },
      i18n,
      ...options,
    });

  beforeEach(async () => {
    jest.clearAllMocks();

    wrapper = createWrapper();
    await global.flushPromises();
  });

  describe('render', () => {
    it('should correctly render component', () => {
      expect(wrapper.name()).toBe('SignInInteractor');
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render form', () => {
      expect(wrapper.find('sign-in-stub').exists()).toBe(true);
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('behavior', () => {
    it('should emit sign-up event', () => {
      expect(wrapper.emitted()['sign-up']).toBeUndefined();

      wrapper.find(SignInView).vm.$emit('sign-up');

      expect(wrapper.emitted()['sign-up'].length).toBe(1);
      expect(wrapper.emitted()['sign-up'][0]).toEqual([]);
    });

    describe('handle social event', () => {
      it('should call service', () => {
        expect(authService.waitLogin).not.toBeCalled();

        wrapper.find(SignInView).vm.$emit('social');

        expect(authService.waitLogin).toBeCalledTimes(1);
        expect(authService.waitLogin).toBeCalledWith();
      });

      it('should emit event', async () => {
        expect.assertions(2);

        expect(wrapper.emitted().social).toBeUndefined();

        wrapper.find(SignInView).vm.$emit('social');
        await global.flushPromises();

        expect(wrapper.emitted().social).toHaveLength(1);
      });

      describe('loading status', () => {
        it('should be false before event', () => {
          expect(
            wrapper.find('sign-in-stub').attributes().isloading,
          ).toBeFalsy();
        });

        it('should be true while waiting', () => {
          wrapper.find(SignInView).vm.$emit('social');

          expect(wrapper.find('sign-in-stub').attributes().isloading).toBe(
            'true',
          );
        });

        it('should be false after sending', async () => {
          expect.assertions(1);

          wrapper.find(SignInView).vm.$emit('social');
          await global.flushPromises();

          expect(
            wrapper.find('sign-in-stub').attributes().isloading,
          ).toBeFalsy();
        });
      });
    });

    describe('submit', () => {
      const defaultServerMode = {
        type: IDENTITY_MODE.DEFAULT,
        serverUrl: undefined,
      };
      const defaultEventParams = {
        email,
        serverMode: defaultServerMode,
      };

      describe('default auth mode', () => {
        it('should emit sign-in event', async () => {
          expect.assertions(3);

          const defaultParams = {
            email,
            serverMode: defaultServerMode,
            isPasswordExist: true,
          };

          identityService.checkRegularPassword.mockResolvedValueOnce(true);

          expect(wrapper.emitted()['sign-in']).toBeUndefined();

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
          await global.flushPromises();

          expect(wrapper.emitted()['sign-in'].length).toBe(1);
          expect(wrapper.emitted()['sign-in'][0]).toEqual([defaultParams]);
        });

        it('should get challenge type', () => {
          expect.assertions(3);

          expect(authService.getAuthChallenge).not.toBeCalled();

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);

          expect(authService.getAuthChallenge).toBeCalledTimes(1);
          expect(authService.getAuthChallenge).toBeCalledWith(email);
        });

        it('should check password existance', async () => {
          expect.assertions(3);

          // identityService.checkRegularPassword.mockResolvedValueOnce(true)
          expect(identityService.checkRegularPassword).not.toBeCalled();

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
          await global.flushPromises();

          expect(identityService.checkRegularPassword).toBeCalledTimes(1);
          expect(identityService.checkRegularPassword).toBeCalledWith(email);
        });
      });

      describe('not default auth mode', () => {
        const notDefaultServerMode = {
          type: IDENTITY_MODE.LOCAL,
          serverUrl: undefined,
        };

        const eventParams = {
          email,
          serverMode: notDefaultServerMode,
        };

        it('should emit sign-in event', async () => {
          expect.assertions(3);

          const defaultParams = {
            email,
            serverMode: notDefaultServerMode,
            isPasswordExist: false,
          };

          expect(wrapper.emitted()['sign-in']).toBeUndefined();

          wrapper.find(SignInView).vm.$emit('submit', eventParams);
          await global.flushPromises();

          expect(wrapper.emitted()['sign-in'].length).toBe(1);
          expect(wrapper.emitted()['sign-in'][0]).toEqual([defaultParams]);
        });

        it('should not get challenge type', async () => {
          expect.assertions(1);

          wrapper.find(SignInView).vm.$emit('submit', eventParams);
          await global.flushPromises();

          expect(authService.getAuthChallenge).not.toBeCalled();
        });

        it('should not check password existance', async () => {
          expect.assertions(1);

          wrapper.find(SignInView).vm.$emit('submit', eventParams);
          await global.flushPromises();

          expect(identityService.checkRegularPassword).not.toBeCalled();
        });
      });

      it('should not handle submit event when loading status true', async () => {
        expect.assertions(1);

        wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
        wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
        await global.flushPromises();

        expect(wrapper.emitted()['sign-in'].length).toBe(1);
      });

      describe('loading status', () => {
        it('should be false before submit', () => {
          expect(
            wrapper.find('sign-in-stub').attributes().isloading,
          ).toBeFalsy();
        });

        it('should be true after submit', () => {
          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);

          expect(wrapper.find('sign-in-stub').attributes().isloading).toBe(
            'true',
          );
        });

        it('should be false after handling submit', async () => {
          expect.assertions(1);

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
          await global.flushPromises();

          expect(
            wrapper.find('sign-in-stub').attributes().isloading,
          ).toBeFalsy();
        });
      });

      describe('error', () => {
        beforeEach(() => {
          authService.getAuthChallenge.mockRejectedValueOnce(
            new Error('error'),
          );
        });

        it('should pass error', async () => {
          expect.assertions(2);

          expect(wrapper.find('sign-in-stub').attributes().error).toBeFalsy();

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
          await global.flushPromises();

          expect(wrapper.find('sign-in-stub').attributes().error).toBe(
            i18n.t('components.compositeAuth.authFailed'),
          );
        });

        it('should remove error if exists before submit', async () => {
          expect.assertions(1);

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);
          await global.flushPromises();

          wrapper.find(SignInView).vm.$emit('submit', defaultEventParams);

          expect(wrapper.find('sign-in-stub').attributes().error).toBeFalsy();
        });
      });
    });
  });
});
