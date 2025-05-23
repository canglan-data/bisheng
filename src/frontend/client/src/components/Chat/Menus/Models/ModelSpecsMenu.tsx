import { useRecoilValue } from 'recoil';
import { useMemo, useCallback, useRef } from 'react';
import { Content, Portal, Root } from '@radix-ui/react-popover';
import { EModelEndpoint, isAssistantsEndpoint } from '~/data-provider/data-provider/src';
import type { TModelSpec, TConversation, TEndpointsConfig } from '~/data-provider/data-provider/src';
import type { KeyboardEvent } from 'react';
import { useChatContext, useAssistantsMapContext } from '~/Providers';
import { useDefaultConvo, useNewConvo, useLocalize } from '~/hooks';
import { getConvoSwitchLogic, getModelSpecIconURL } from '~/utils';
import { useGetEndpointsQuery } from '~/data-provider';
import MenuButton from './MenuButton';
import ModelSpecs from './ModelSpecs';
import store from '~/store';

export default function ModelSpecsMenu({ modelSpecs }: { modelSpecs?: TModelSpec[] }) {
  const { conversation } = useChatContext();
  const { newConversation } = useNewConvo();

  const localize = useLocalize();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();
  const modularChat = useRecoilValue(store.modularChat);
  const getDefaultConversation = useDefaultConvo();
  const assistantMap = useAssistantsMapContext();

  const onSelectSpec = (spec: TModelSpec) => {
    const { preset } = spec;
    preset.iconURL = getModelSpecIconURL(spec);
    preset.spec = spec.name;
    const { endpoint } = preset;
    const newEndpoint = endpoint ?? '';
    if (!newEndpoint) {
      return;
    }

    const {
      template,
      shouldSwitch,
      isNewModular,
      newEndpointType,
      isCurrentModular,
      isExistingConversation,
    } = getConvoSwitchLogic({
      newEndpoint,
      modularChat,
      conversation,
      endpointsConfig,
    });

    if (newEndpointType) {
      preset.endpointType = newEndpointType;
    }

    if (isAssistantsEndpoint(newEndpoint) && preset.assistant_id != null && !(preset.model ?? '')) {
      preset.model = assistantMap?.[newEndpoint]?.[preset.assistant_id]?.model;
    }

    const isModular = isCurrentModular && isNewModular && shouldSwitch;
    if (isExistingConversation && isModular) {
      template.endpointType = newEndpointType as EModelEndpoint | undefined;

      const currentConvo = getDefaultConversation({
        /* target endpointType is necessary to avoid endpoint mixing */
        conversation: { ...(conversation ?? {}), endpointType: template.endpointType },
        preset: template,
      });

      /* We don't reset the latest message, only when changing settings mid-converstion */
      newConversation({
        template: currentConvo,
        preset,
        keepLatestMessage: true,
        keepAddedConvos: true,
      });
      return;
    }

    newConversation({
      template: { ...(template as Partial<TConversation>) },
      preset,
      keepAddedConvos: isModular,
    });
  };

  const selected = useMemo(() => {
    const spec = modelSpecs?.find((spec) => spec.name === conversation?.spec);
    if (!spec) {
      return undefined;
    }
    return spec;
  }, [modelSpecs, conversation?.spec]);

  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="option"]');
    if (!menuItems) {
      return;
    }
    if (!menuItems.length) {
      return;
    }

    const currentIndex = Array.from(menuItems).findIndex((item) => item === document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < menuItems.length - 1) {
          (menuItems[currentIndex + 1] as HTMLElement).focus();
        } else {
          (menuItems[0] as HTMLElement).focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          (menuItems[currentIndex - 1] as HTMLElement).focus();
        } else {
          (menuItems[menuItems.length - 1] as HTMLElement).focus();
        }
        break;
    }
  }, []);

  return (
    <Root>
      <MenuButton
        selected={selected}
        className="min-h-11"
        textClassName="block items-center justify-start text-xs md:text-base whitespace-nowrap max-w-64 overflow-hidden shrink-0 text-ellipsis"
        primaryText={selected?.label ?? ''}
        endpointsConfig={endpointsConfig}
      />
      <Portal>
        {modelSpecs && modelSpecs.length && (
          <div
            style={{
              position: 'fixed',
              left: '0px',
              top: '0px',
              transform: 'translate3d(268px, 50px, 0px)',
              minWidth: 'max-content',
              zIndex: 'auto',
            }}
          >
            <Content
              side="bottom"
              align="start"
              id="llm-menu"
              role="listbox"
              ref={menuRef}
              onKeyDown={handleKeyDown}
              aria-label={localize('com_ui_llms_available')}
              className="models-scrollbar mt-2 max-h-[65vh] min-w-[340px] max-w-xs overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-700 dark:text-white lg:max-h-[75vh]"
            >
              <ModelSpecs
                specs={modelSpecs}
                selected={selected}
                setSelected={onSelectSpec}
                endpointsConfig={endpointsConfig}
              />
            </Content>
          </div>
        )}
      </Portal>
    </Root>
  );
}
