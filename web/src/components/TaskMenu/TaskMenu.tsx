import { Dots, Item, List, Wrap } from "./TaskMenu.styles";
import { IconButton } from "../../styles/ui";
import { useMenu } from "../../hooks/useMenu";
import type { Task } from "../../lib/types";

interface TaskMenuProps {
  task: Task;
  disabled: boolean;
  onArchive: (task: Task) => void;
  onRestore: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskMenu({ task, disabled, onArchive, onRestore, onDelete }: TaskMenuProps) {
  const menu = useMenu();

  const choose = (action: (task: Task) => void) => {
    menu.close();
    action(task);
  };

  return (
    <Wrap>
      <IconButton
        ref={menu.triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`Actions for ${task.title}`}
        {...menu.triggerProps}
        onClick={menu.toggle}
      >
        <Dots aria-hidden="true">&#8943;</Dots>
      </IconButton>

      {menu.open ? (
        <List ref={menu.menuRef} id={menu.menuId} role="menu">
          {task.archived ? (
            <Item type="button" role="menuitem" onClick={() => choose(onRestore)}>
              Restore to board
            </Item>
          ) : (
            <Item type="button" role="menuitem" onClick={() => choose(onArchive)}>
              Archive
            </Item>
          )}
          <Item type="button" role="menuitem" $danger onClick={() => choose(onDelete)}>
            Delete
          </Item>
        </List>
      ) : null}
    </Wrap>
  );
}
