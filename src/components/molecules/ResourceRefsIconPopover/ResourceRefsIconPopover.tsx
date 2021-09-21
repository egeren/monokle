import MonoIcon, {MonoIconTypes} from '@components/atoms/MonoIcon';
import {K8sResource} from '@models/k8sresource';
import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {selectFile, selectK8sResource} from '@redux/reducers/main';
import {isIncomingRef, isOutgoingRef, isUnsatisfiedRef} from '@redux/services/resourceRefs';
import {Popover} from 'antd';
import {useMemo} from 'react';
import styled from 'styled-components';
import RefsPopoverContent from './RefsPopoverContent';

const StyledIconsContainer = styled.span`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ResourceRefsIconPopover = (props: {resource: K8sResource; type: 'incoming' | 'outgoing'}) => {
  const {resource, type} = props;
  const dispatch = useAppDispatch();
  const resourceMap = useAppSelector(state => state.main.resourceMap);
  const fileMap = useAppSelector(state => state.main.fileMap);
  const resourceRefs = useMemo(
    () =>
      resource.refs?.filter(r => {
        if (type === 'incoming') {
          return isIncomingRef(r.type);
        }
        return isOutgoingRef(r.type) || isUnsatisfiedRef(r.type);
      }),
    [resource, type]
  );
  const hasUnsatisfiedRefs = useMemo(() => {
    if (type === 'incoming') {
      return false;
    }
    return resourceRefs?.some(r => isUnsatisfiedRef(r.type));
  }, [resourceRefs, type]);

  const selectResource = (selectedId: string) => {
    if (resourceMap[selectedId]) {
      dispatch(selectK8sResource({resourceId: selectedId}));
    }
  };

  const selectFilePath = (filePath: string) => {
    if (fileMap[filePath]) {
      dispatch(selectFile({filePath}));
    }
  };

  if (!resourceRefs || resourceRefs.length === 0) {
    return null;
  }

  return (
    <Popover
      mouseEnterDelay={0.5}
      placement="rightTop"
      content={
        <RefsPopoverContent
          resourceRefs={resourceRefs}
          resourceMap={resourceMap}
          selectResource={selectResource}
          selectFilePath={selectFilePath}
        >
          {type === 'incoming' ? (
            <>
              Incoming Links <MonoIcon type={MonoIconTypes.IncomingRefs} />
            </>
          ) : (
            <>
              Outgoing Links <MonoIcon type={MonoIconTypes.OutgoingRefs} />
            </>
          )}
        </RefsPopoverContent>
      }
    >
      <StyledIconsContainer>
        <MonoIcon
          type={type === 'incoming' ? MonoIconTypes.IncomingRefs : MonoIconTypes.OutgoingRefs}
          style={type === 'incoming' ? {marginRight: 5} : {marginLeft: 5}}
        />
        {hasUnsatisfiedRefs && <MonoIcon type={MonoIconTypes.Warning} style={{marginLeft: 5}} />}
      </StyledIconsContainer>
    </Popover>
  );
};

export default ResourceRefsIconPopover;
