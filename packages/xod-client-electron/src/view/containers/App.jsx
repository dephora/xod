/* eslint-disable react/forbid-prop-types */

import fs from 'fs';
import R from 'ramda';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { HotKeys } from 'react-hotkeys';
import EventListener from 'react-event-listener';
import { ipcRenderer, remote as remoteElectron } from 'electron';

import client from 'xod-client';
import {
  getProjectName,
  getProjectAuthors,
  isValidIdentifier,
  IDENTIFIER_RULES,
} from 'xod-project';

import * as actions from '../actions';
import * as uploadActions from '../../upload/actions';
import { getUploadProcess } from '../../upload/selectors';
import { SAVE_PROJECT } from '../actionTypes';
import { UPLOAD, UPLOAD_TO_ARDUINO } from '../../upload/actionTypes';
import PopupSetWorkspace from '../../settings/components/PopupSetWorkspace';
import PopupSetArduinoIDEPath from '../../settings/components/PopupSetArduinoIDEPath';
import PopupCreateWorkspace from '../../settings/components/PopupCreateWorkspace';
import PopupProjectSelection from '../../projects/components/PopupProjectSelection';
import PopupUploadProject from '../../upload/components/PopupUploadProject';
import { REDUCER_STATUS } from '../../projects/constants';
import { SaveProgressBar } from '../components/SaveProgressBar';

import * as ERROR_CODES from '../../shared/errorCodes';
import * as MESSAGES from '../../shared/messages';
import * as EVENTS from '../../shared/events';

const { app, dialog, Menu } = remoteElectron;
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

const onContextMenu = (event) => {
  event.preventDefault();
  event.stopPropagation();

  const { items } = client.menu;
  const InputMenu = Menu.buildFromTemplate([
    items.cut,
    items.copy,
    items.paste,
  ]);

  const node = event.target;
  const isEditable = (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable);
  const isEnabled = !node.disabled;
  if (isEditable && isEnabled) { InputMenu.popup(remoteElectron.getCurrentWindow()); }
};

const defaultState = {
  size: client.getViewableSize(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT),
  workspace: '',
  code: '',
};

class App extends client.App {
  constructor(props) {
    super(props);

    this.state = R.clone(defaultState);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onResize = this.onResize.bind(this);

    this.onUpload = this.onUpload.bind(this);
    this.onUploadToArduino = this.onUploadToArduino.bind(this);
    this.onShowCodeEspruino = this.onShowCodeEspruino.bind(this);
    this.onShowCodeNodejs = this.onShowCodeNodejs.bind(this);
    this.onShowCodeArduino = this.onShowCodeArduino.bind(this);
    this.onImportClicked = this.onImportClicked.bind(this);
    this.onImport = this.onImport.bind(this);
    this.onExport = this.onExport.bind(this);
    this.onSaveProject = this.onSaveProject.bind(this);
    this.onOpenProjectClicked = this.onOpenProjectClicked.bind(this);

    this.onAddNodeClick = this.onAddNodeClick.bind(this);
    this.onUploadPopupClose = this.onUploadPopupClose.bind(this);
    this.onCloseApp = this.onCloseApp.bind(this);
    this.onWorkspaceChange = this.onWorkspaceChange.bind(this);
    this.onWorkspaceCreate = this.onWorkspaceCreate.bind(this);
    this.onCreateProject = this.onCreateProject.bind(this);

    this.onLoadProject = this.onLoadProject.bind(this);
    this.onSelectProject = this.onSelectProject.bind(this);
    this.onArduinoPathChange = this.onArduinoPathChange.bind(this);

    this.hideAllPopups = this.hideAllPopups.bind(this);
    this.showPopupProjectSelection = this.showPopupProjectSelection.bind(this);
    this.showPopupSetWorkspace = this.showPopupSetWorkspace.bind(this);
    this.showPopupSetWorkspaceNotCancellable = this.showPopupSetWorkspaceNotCancellable.bind(this);
    this.showPopupCreateProject = this.showPopupCreateProject.bind(this);
    this.showArduinoIdeNotFoundPopup = this.showArduinoIdeNotFoundPopup.bind(this);
    this.showCreateWorkspacePopup = this.showCreateWorkspacePopup.bind(this);

    this.initNativeMenu();

    // Reactions on messages from Main Process
    ipcRenderer.on(
      EVENTS.UPDATE_WORKSPACE,
      (event, workspacePath) => this.setState({ workspace: workspacePath })
    );
    ipcRenderer.on(
      EVENTS.REQUEST_SELECT_PROJECT,
      (event, data) => this.showPopupProjectSelection(data)
    );
    ipcRenderer.on(
      EVENTS.REQUEST_SHOW_PROJECT,
      (event, project) => this.onLoadProject(project)
    );
    ipcRenderer.on(
      EVENTS.REQUEST_CREATE_WORKSPACE,
      (event, { path, force }) => this.showCreateWorkspacePopup(path, force)
    );
    ipcRenderer.on(
      EVENTS.WORKSPACE_ERROR,
      (event, data) => {
        // TODO: Catch CANT_OPEN_SELECTED_PROJECT and show something else
        //       (its strange to ask to switch workspace if project has broken).
        this.showPopupSetWorkspaceNotCancellable();
        this.props.actions.addError(MESSAGES.ERRORS[data.errorCode]);
      }
    );
  }

  onResize() {
    this.setState(
      R.set(
        R.lensProp('size'),
        client.getViewableSize(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT),
        this.state
      )
    );
  }

  onUpload() {
    this.showUploadProgressPopup();
    this.props.actions.upload();
  }

  onUploadToArduino(pab, processActions = null) {
    const { project, currentPatchPath } = this.props;
    const proc = (processActions !== null) ? processActions : this.props.actions.uploadToArduino();

    this.showUploadProgressPopup();
    ipcRenderer.send(UPLOAD_TO_ARDUINO, {
      pab,
      project,
      patchPath: currentPatchPath,
    });
    ipcRenderer.on(UPLOAD_TO_ARDUINO, (event, payload) => {
      if (payload.progress) {
        proc.progress(payload.message, payload.percentage);
        return;
      }
      if (payload.success) {
        proc.success(payload.message);
      }
      if (payload.failure) {
        if (payload.errorCode === ERROR_CODES.IDE_NOT_FOUND) {
          this.hideAllPopups();
          this.showArduinoIdeNotFoundPopup();
          ipcRenderer.once('SET_ARDUINO_IDE',
            (evt, response) => {
              if (response.code === 0) this.onUploadToArduino(pab, proc);
            }
          );
        }
        proc.fail(payload.message);
      }
      // Remove listener if process is finished.
      ipcRenderer.removeAllListeners(UPLOAD_TO_ARDUINO);
    });
  }

  onCreateProject(projectName) {
    this.props.actions.createProject(projectName);
    this.hideAllPopups();
    this.onSaveProject();
  }

  onOpenProjectClicked() {
    ipcRenderer.send(EVENTS.OPEN_PROJECT);
    this.showPopupProjectSelection();
  }

  onSelectProject(projectMeta) {
    ipcRenderer.send(EVENTS.SELECT_PROJECT, projectMeta);
    this.hideAllPopups();
  }

  onLoadProject(project) {
    this.props.actions.openProject(project);
  }

  onImportClicked() {
    dialog.showOpenDialog(
      {
        properties: ['openFile'],
        filters: [
          { name: 'xodball', extensions: ['xodball'] },
        ],
      },
      (filePaths) => {
        if (!filePaths) return;

        fs.readFile(filePaths[0], 'utf8', (err, data) => {
          if (err) {
            this.props.actions.addError(err.message);
          }

          this.onImport(data);
        });
      }
    );
  }

  onWorkspaceChange(val) {
    this.hideAllPopups();
    ipcRenderer.send(EVENTS.SWITCH_WORKSPACE, val);
  }

  onWorkspaceCreate(path) {
    this.hideAllPopups();
    ipcRenderer.send(EVENTS.CREATE_WORKSPACE, path);
  }

  onSaveProject() {
    this.props.actions.saveProject(this.props.project);
  }

  onAddNodeClick() {
    this.props.actions.setMode(client.EDITOR_MODE.CREATING_NODE);
  }

  onUploadPopupClose(id) {
    this.hideAllPopups();
    this.props.actions.deleteProcess(id, UPLOAD);
  }

  onKeyDown(event) { // eslint-disable-line class-methods-use-this
    const keyCode = event.keyCode || event.which;

    if (!client.isInputTarget(event) && keyCode === client.KEYCODE.BACKSPACE) {
      event.preventDefault();
    }

    return false;
  }

  onCloseApp() { // eslint-disable-line class-methods-use-this
    if (this.props.hasChanges) {
      // TODO: Add confirmation popup to prevent closing with unsaved changes
      //       'You have not saved changes in your project. Are you sure want to close app?'
    }

    return true;
  }

  onArduinoPathChange(newPath) {
    ipcRenderer.send('SET_ARDUINO_IDE', { path: newPath });
    ipcRenderer.once('SET_ARDUINO_IDE',
      (event, payload) => {
        if (payload.code === 0) this.hideAllPopups();
      }
    );
  }

  getSaveProgress() {
    if (this.props.saveProcess && this.props.saveProcess.progress) {
      return this.props.saveProcess.progress;
    }

    return 0;
  }

  getMenuBarItems() {
    const {
      items,
      onClick,
      submenu,
    } = client.menu;

    return [
      submenu(
        items.file,
        [
          onClick(items.newProject, this.showPopupCreateProject),
          onClick(items.openProject, this.onOpenProjectClicked),
          onClick(items.saveProject, this.onSaveProject),
          onClick(items.renameProject, this.props.actions.requestRenameProject),
          onClick(items.selectWorkspace, this.showPopupSetWorkspace),
          items.separator,
          onClick(items.importProject, this.onImportClicked),
          onClick(items.exportProject, this.onExport),
          items.separator,
          onClick(items.newPatch, this.props.actions.createPatch),
        ]
      ),
      submenu(
        items.edit,
        [
          onClick(items.undo, this.props.actions.undoCurrentPatch),
          onClick(items.redo, this.props.actions.redoCurrentPatch),
          items.separator,
          items.cut,
          items.copy,
          items.paste,
        ]
      ),
      submenu(
        items.deploy,
        [
          onClick(items.showCodeForEspruino, this.onShowCodeEspruino),
          onClick(items.uploadToEspruino, this.onUpload),
          items.separator,
          onClick(items.showCodeForNodeJS, this.onShowCodeNodejs),
          items.separator,
          onClick(items.showCodeForArduino, this.onShowCodeArduino),
          // TODO: Remove this hardcode and do a magic in the xod-arduino-builder
          onClick(items.uploadToArduinoUno, () => this.onUploadToArduino(
            {
              package: 'arduino',
              architecture: 'avr',
              board: 'uno',
            }
          )),
          onClick(items.uploadToArduinoLeonardo, () => this.onUploadToArduino(
            {
              package: 'arduino',
              architecture: 'avr',
              board: 'leonardo',
            }
          )),
          onClick(items.uploadToArduinoM0, () => this.onUploadToArduino(
            {
              package: 'arduino',
              architecture: 'samd',
              board: 'mzero_bl',
            }
          )),
        ]
      ),
    ];
  }

  getKeyMap() { // eslint-disable-line class-methods-use-this
    const commandsBoundToNativeMenu = R.compose(
      R.reject(R.isNil),
      R.map(R.prop('command')),
      R.values
    )(client.menu.items);

    return R.omit(commandsBoundToNativeMenu, client.HOTKEY);
  }

  initNativeMenu() {
    const template = this.getMenuBarItems();

    // Browser controls
    template.push({
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    });

    if (process.platform === 'darwin') {
      // on a mac the first menu always has to be like this
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services', submenu: [] },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      });

      template.push({
        role: 'window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  showUploadProgressPopup() {
    this.props.actions.showPopup(client.POPUP_ID.UPLOADING);
  }

  showCodePopup() {
    this.props.actions.showPopup(client.POPUP_ID.SHOWING_CODE, { code: this.state.code });
  }

  showPopupCreateProject() {
    this.props.actions.showPopup(client.POPUP_ID.CREATING_PROJECT);
  }

  showPopupProjectSelection(projects) {
    const data = projects ? {
      status: REDUCER_STATUS.LOADED,
      list: projects,
    } : {
      status: REDUCER_STATUS.PENDING,
    };

    this.props.actions.showPopup(client.POPUP_ID.OPENING_PROJECT, data);
  }

  showArduinoIdeNotFoundPopup() {
    this.props.actions.showPopup(client.POPUP_ID.ARDUINO_IDE_NOT_FOUND);
  }

  showPopupSetWorkspace() {
    this.props.actions.showPopup(client.POPUP_ID.SWITCHING_WORKSPACE, { disposable: false });
  }

  showPopupSetWorkspaceNotCancellable() {
    this.props.actions.showPopup(client.POPUP_ID.SWITCHING_WORKSPACE, { disposable: true });
  }

  showCreateWorkspacePopup(path, force) {
    this.props.actions.showPopup(client.POPUP_ID.CREATING_WORKSPACE, { path, force });
  }

  hideAllPopups() {
    this.props.actions.hideAllPopups();
  }

  render() {
    return (
      <HotKeys keyMap={this.getKeyMap()} id="App" onContextMenu={onContextMenu}>
        <EventListener
          target={window}
          onResize={this.onResize}
          onKeyDown={this.onKeyDown}
          onBeforeUnload={this.onCloseApp}
        />
        <client.Toolbar
          projectName={getProjectName(this.props.project)}
          projectAuthors={getProjectAuthors(this.props.project)}
        />
        <client.Editor size={this.state.size} />
        <client.SnackBar />
        <client.PopupShowCode
          isVisible={this.props.popups.showCode}
          code={this.props.popupsData.showCode.code}
          onClose={this.hideAllPopups}
        />
        <PopupUploadProject
          isVisible={this.props.popups.uploadProject}
          upload={this.props.upload}
          onClose={this.onUploadPopupClose}
        />
        <client.PopupPrompt
          title="Create new project"
          confirmText="Create project"
          isVisible={this.props.popups.createProject}
          onConfirm={this.onCreateProject}
          onClose={this.hideAllPopups}
          inputMask={client.lowercaseKebabMask}
          inputValidator={isValidIdentifier}
          helpText={IDENTIFIER_RULES}
        >
          <p>
            Please, give a sonorous name to your project:
          </p>
        </client.PopupPrompt>
        <PopupSetArduinoIDEPath
          isVisible={this.props.popups.arduinoIDENotFound}
          onChange={this.onArduinoPathChange}
          onClose={this.hideAllPopups}
        />
        <PopupSetWorkspace
          workspace={this.state.workspace}
          isDisposable={R.propOr(false, 'disposable', this.props.popupsData.switchWorkspace)}
          isVisible={this.props.popups.switchWorkspace}
          onChange={this.onWorkspaceChange}
          onClose={this.hideAllPopups}
        />
        <PopupProjectSelection
          projects={this.props.popupsData.projectSelection}
          isVisible={this.props.popups.projectSelection}
          onSelect={this.onSelectProject}
          onClose={this.hideAllPopups}
          onSwitchWorkspace={this.showPopupSetWorkspace}
          onCreateNewProject={this.showPopupCreateProject}
        />
        <PopupCreateWorkspace
          data={this.props.popupsData.createWorkspace}
          isVisible={this.props.popups.createWorkspace}
          onCreateWorkspace={this.onWorkspaceCreate}
          onClose={this.showPopupSetWorkspaceNotCancellable}
        />
        <SaveProgressBar progress={this.getSaveProgress()} />
      </HotKeys>
    );
  }
}

App.propTypes = R.merge(client.App.propTypes, {
  hasChanges: React.PropTypes.bool,
  projects: React.PropTypes.object,
  actions: React.PropTypes.objectOf(React.PropTypes.func),
  upload: React.PropTypes.object,
  workspace: React.PropTypes.string,
  popups: React.PropTypes.objectOf(React.PropTypes.bool),
  popupsData: React.PropTypes.objectOf(React.PropTypes.object),
});

const mapStateToProps = (state) => {
  const processes = client.getProccesses(state);

  return ({
    hasChanges: client.projectHasChanges(state),
    project: client.getProject(state),
    upload: getUploadProcess(state),
    saveProcess: client.findProcessByType(SAVE_PROJECT)(processes),
    currentPatchPath: client.getCurrentPatchPath(state),
    popups: {
      createProject: client.getPopupVisibility(client.POPUP_ID.CREATING_PROJECT)(state),
      projectSelection: client.getPopupVisibility(client.POPUP_ID.OPENING_PROJECT)(state),
      switchWorkspace: client.getPopupVisibility(client.POPUP_ID.SWITCHING_WORKSPACE)(state),
      createWorkspace: client.getPopupVisibility(client.POPUP_ID.CREATING_WORKSPACE)(state),
      arduinoIDENotFound: client.getPopupVisibility(client.POPUP_ID.ARDUINO_IDE_NOT_FOUND)(state),
      uploadProject: client.getPopupVisibility(client.POPUP_ID.UPLOADING)(state),
      showCode: client.getPopupVisibility(client.POPUP_ID.SHOWING_CODE)(state),
    },
    popupsData: {
      projectSelection: client.getPopupData(client.POPUP_ID.OPENING_PROJECT)(state),
      createWorkspace: client.getPopupData(client.POPUP_ID.CREATING_WORKSPACE)(state),
      switchWorkspace: client.getPopupData(client.POPUP_ID.SWITCHING_WORKSPACE)(state),
      showCode: client.getPopupData(client.POPUP_ID.SHOWING_CODE)(state),
    },
  });
};

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    createProject: client.createProject,
    requestRenameProject: client.requestRenameProject,
    setMode: client.setMode,
    openProject: client.openProject,
    saveProject: actions.saveProject,
    importProject: client.importProject, // used in base App class
    upload: uploadActions.upload,
    uploadToArduino: uploadActions.uploadToArduino,
    addError: client.addError,
    addConfirmation: client.addConfirmation,
    deleteProcess: client.deleteProcess,
    createPatch: client.requestCreatePatch,
    undoCurrentPatch: client.undoCurrentPatch,
    redoCurrentPatch: client.redoCurrentPatch,
    showPopup: client.showPopup,
    hideAllPopups: client.hideAllPopups,
  }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
