import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import "./styles/modal.css";

export interface ModalDetails {
  title?: string;
  content: React.JSX.Element;
}

interface ModalContextInterface {
  setModal: { (details: ModalDetails | null): void };
}

const ModalContext = createContext({
  setModal(details: ModalDetails | null) {
    throw new Error("Must be used from within an initialized ModalContainer");
  },
} as ModalContextInterface);

/**
 * Wrap your App container with this component, allowing
 * the modal to be appended after the content in the DOM tree
 */
export function ModalContainer(props: PropsWithChildren) {
  const [currentModal, setCurrentModal] = useState<ModalDetails | null>(null);
  const closeModal = useCallback(
    () => setCurrentModal(null),
    [setCurrentModal]
  );
  return (
    <ModalContext.Provider
      value={
        {
          setModal: setCurrentModal,
        } as ModalContextInterface
      }
    >
      {props.children}
      {currentModal && (
        <div className="modal-container" style={{ display: "block" }}>
          <div className="modal-window">
            <div className="modal-window-header">
              <span className="modal-window-title">{currentModal.title}</span>
              <img
                src="assets/img/close-x-64x64.png"
                className="modal-close-btn"
                width="32px"
                height="32px"
                onClick={closeModal}
                alt="close"
              />
            </div>
            <div className="modal-content">{currentModal.content}</div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

/**
 * Use this hook to control what gets displayed in the modal,
 * and to close it.
 */
export function useModal() {
  const { setModal } = useContext(ModalContext);
  const closeModal = useCallback(() => setModal(null), [setModal]);
  const openAsModal = useCallback(
    (title: string, content: React.JSX.Element) => setModal({ title, content }),
    [setModal]
  );
  return { setModal, closeModal, openAsModal };
}
