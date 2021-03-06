import MockAdapter from 'axios-mock-adapter';
import {
  docStatusErrorProcessing,
  docStatusUploadProcessing,
  docStatusUploadNoContent,
} from '@unitFixtures/documents';
import http from '@/class/singleton/request/http';
import { UPLOAD_STATUSES } from '@/constants';

const documentsService = require.requireActual('@/service/documents').default;

jest.useFakeTimers();

describe('Documents service', () => {
  const axiosMock = new MockAdapter(http);

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('checkFile', () => {
    const requestUrlForDocCheck = `${ENV.VUE_APP_IDENTITY_API_URL}/documents/file/check`;

    it('should handle successful CHECK /api/v1.1/documents/file/check', async () => {
      expect.assertions(1);

      axiosMock.onPost(requestUrlForDocCheck).reply(200);

      await expect(documentsService.checkFile({})).resolves.not.toThrow();
    });

    it('should throw fail CHECK /api/v1.1/documents/file/check', async () => {
      expect.assertions(1);

      axiosMock.onPost(requestUrlForDocCheck).reply(422);

      await expect(documentsService.checkFile({})).rejects.toThrow();
    });
  });

  describe('check file status', () => {
    const docId = 'docId';
    const requestUrlForDocCheck = `${ENV.VUE_APP_IDENTITY_API_URL}/documents/${docId}/status/upload`;

    it('should return front uploaded result', async () => {
      expect.assertions(1);

      // test code
      axiosMock
        .onGet(requestUrlForDocCheck)
        .reply(200, docStatusUploadNoContent);

      const res = await documentsService.getDocumentUploadStatusById(docId);
      expect(res).toBe(UPLOAD_STATUSES.UPLOADED);
    });

    it('should return back processing result', async () => {
      expect.assertions(1);

      axiosMock
        .onGet(requestUrlForDocCheck)
        .reply(200, docStatusUploadProcessing);

      const res = await documentsService.getDocumentUploadStatusById(docId);
      expect(res).toBe(UPLOAD_STATUSES.PROCESSING);
    });

    it('should return error processing result', async () => {
      expect.assertions(1);

      axiosMock
        .onGet(requestUrlForDocCheck)
        .reply(200, docStatusErrorProcessing);

      const res = await documentsService.getDocumentUploadStatusById(docId);
      expect(res).toBe(UPLOAD_STATUSES.ERRORED);
    });
  });

  describe('wait document recognize', () => {
    const docId = 'docId';
    const mockStatusOnce = status => {
      const spy = jest.spyOn(documentsService, 'getDocumentUploadStatusById');
      spy.mockResolvedValue(status);
    };

    it('should throw error, if something goes wrong', async () => {
      expect.assertions(1);

      const message = 'Recognize error';
      mockStatusOnce(UPLOAD_STATUSES.ERRORED);

      try {
        await documentsService.waitDocumentUpload(docId);
      } catch (e) {
        expect(e.message).toBe(message);
      }
    });

    it('should not to be as resolved', async () => {
      expect.assertions(1);

      let isDone = false;

      mockStatusOnce(UPLOAD_STATUSES.PROCESSING);

      documentsService.waitDocumentUpload(docId).then(() => {
        isDone = true;
      });

      await global.flushPromises();

      expect(isDone).toBe(false);
    });

    it('should resolve recognize after upload done', async () => {
      expect.assertions(2);

      mockStatusOnce(UPLOAD_STATUSES.PROCESSING);
      let isDone = false;

      documentsService.waitDocumentUpload(docId).then(() => {
        isDone = true;
      });

      await global.flushPromises();

      expect(isDone).toBe(false);

      mockStatusOnce(UPLOAD_STATUSES.UPLOADED);
      jest.runOnlyPendingTimers();
      await global.flushPromises();

      expect(isDone).toBe(true);
    });
  });

  describe('uploadDocument', () => {
    const docId = 'docId';
    const requestUrlForDocData = `${ENV.VUE_APP_IDENTITY_API_URL}/documents`;
    const requestUrlForDocFront = `${ENV.VUE_APP_IDENTITY_API_URL}/documents/${docId}/front`;
    const successResp = { success: true, message: docId };

    it('should handle successful UPLOAD /api/v1.1/documents', async () => {
      expect.assertions(1);

      axiosMock.onPost(requestUrlForDocFront).reply(200, successResp);

      await expect(
        documentsService.uploadFrontFile({ docId }),
      ).resolves.not.toThrow();
    });

    it('should throw fail UPLOAD /api/v1.1/documents', async () => {
      expect.assertions(1);

      axiosMock.onPost(requestUrlForDocFront).reply(409, { success: false });

      await expect(documentsService.uploadFrontFile({})).rejects.toThrow();
    });

    it('should throw fail UPLOAD /api/v1.1/documents with bad doc id', async () => {
      expect.assertions(1);

      axiosMock
        .onPost(requestUrlForDocData)
        .reply(200, { ...successResp, message: '' });
      axiosMock.onPost(requestUrlForDocFront).reply(200, successResp);

      await expect(documentsService.uploadFrontFile({})).rejects.toThrow();
    });
  });
});
