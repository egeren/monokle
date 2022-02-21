import * as k8s from '@kubernetes/client-node';

import navSectionNames from '@constants/navSectionNames';

import {K8sResource} from '@models/k8sresource';
import {ResourceKindHandler} from '@models/resourcekindhandler';

const SecretHandler: ResourceKindHandler = {
  kind: 'Secret',
  apiVersionMatcher: '**',
  navigatorPath: [navSectionNames.K8S_RESOURCES, navSectionNames.CONFIGURATION, 'Secrets'],
  clusterApiVersion: 'v1',
  validationSchemaPrefix: 'io.k8s.api.core.v1',
  isCustom: false,
  getResourceFromCluster(kubeconfig: k8s.KubeConfig, resource: K8sResource): Promise<any> {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    return k8sCoreV1Api.readNamespacedSecret(resource.name, resource.namespace || 'default', 'true');
  },
  async listResourcesInCluster(kubeconfig: k8s.KubeConfig, { namespace }) {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    const response = await k8sCoreV1Api.listNamespacedSecret(namespace);
    return response.body.items;
  },
  async deleteResourceInCluster(kubeconfig: k8s.KubeConfig, resource: K8sResource) {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    await k8sCoreV1Api.deleteNamespacedSecret(resource.name, resource.namespace || 'default');
  },
  outgoingRefMappers: [
    {
      source: {
        pathParts: ['metadata', 'annotations', 'kubernetes.io/service-account.name'],
      },
      target: {
        kind: 'ServiceAccount',
      },
      type: 'name',
    },
  ],
  helpLink: 'https://kubernetes.io/docs/concepts/configuration/secret/',
};

export default SecretHandler;
