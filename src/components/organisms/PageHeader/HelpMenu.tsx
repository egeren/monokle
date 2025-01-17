import {Col, Dropdown, Menu, Row} from 'antd';

import {FileSearchOutlined, GithubOutlined, QuestionCircleOutlined} from '@ant-design/icons';

import styled from 'styled-components';

import {openDiscord, openDocumentation, openGitHub, openKeyboardShortcuts} from '@utils/shell';

import DiscordLogo from '@assets/DiscordLogo.svg';

import {FontColors} from '@styles/Colors';

const IconContainerSpan = styled.span`
  width: 18px;
  height: 18px;
  color: ${FontColors.elementSelectTitle};
  font-size: 18px;
  cursor: pointer;
`;

const StyledQuestionCircleOutlined = styled(QuestionCircleOutlined)`
  cursor: pointer;
  font-size: 20px;
  color: ${FontColors.elementSelectTitle};
`;

const MenuItem = styled(Menu.Item)`
  padding-right: 20px;
`;

const HelpMenu = () => {
  const menu = (
    <Menu inlineIndent={25}>
      <MenuItem onClick={openDocumentation} key="documentation" style={{paddingRight: '20px'}}>
        <Row align="middle">
          <Col span={5}>
            <IconContainerSpan>
              <FileSearchOutlined />
            </IconContainerSpan>
          </Col>

          <Col span={19}>Documentation</Col>
        </Row>
      </MenuItem>

      <MenuItem onClick={openKeyboardShortcuts} key="hotkeys" style={{paddingRight: '20px'}}>
        <Row align="middle">
          <Col span={5}>
            <IconContainerSpan>
              <FileSearchOutlined />
            </IconContainerSpan>
          </Col>

          <Col span={19}>Keyboard Shortcuts</Col>
        </Row>
      </MenuItem>

      <MenuItem onClick={openGitHub} key="github">
        <Row align="middle">
          <Col span={5}>
            <IconContainerSpan>
              <GithubOutlined />
            </IconContainerSpan>
          </Col>

          <Col span={19}>GitHub</Col>
        </Row>
      </MenuItem>

      <MenuItem onClick={openDiscord} key="discord">
        <Row align="middle">
          <Col span={5}>
            <IconContainerSpan>
              <img src={DiscordLogo} style={{height: '18px', width: '18px'}} />
            </IconContainerSpan>
          </Col>

          <Col span={19}>Discord</Col>
        </Row>
      </MenuItem>
    </Menu>
  );

  return (
    <Dropdown key="more" overlay={menu}>
      <StyledQuestionCircleOutlined />
    </Dropdown>
  );
};

export default HelpMenu;
