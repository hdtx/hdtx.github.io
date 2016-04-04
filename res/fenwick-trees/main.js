// Copyright (c) 2016 Henrique Daitx.
// Released under the MIT License.

angular.module('fenwickTreesApp', ['ngAnimate'])
  .controller('fenwickTreesCtrl', function ($scope) {
    // underscore.js
    $scope._ = _;

    // maximum number of elements
    $scope.max_vlen = 32;

    // actual number of elements
    $scope.vlen = $scope.max_vlen >> 1;

    // algorithm data vector
    $scope.v = [];
    var reset_v = function () {
      $scope.v = [];
      for (var i = 0; i < $scope.vlen; i++)
        $scope.v.push(0);
    }

    // prefix sum vector
    $scope.ps_v = [];

    // elements vector
    $scope.el_v = _.range($scope.max_vlen);

    // "traces" for the add and prefix sum operations
    $scope.trace_add = [];
    $scope.trace_ps = [];

    // end element symbol
    $scope.end_element = 0;

    // drawing data for the add and lookup trees
    $scope.ps_d = {};
    $scope.add_d = {};

    // "container" element, because reasons - apparently anything that will be directly modified inside a ngRepeat (for example, by a ngMouseEnter) has to be inside an object inside the scope (don't ask) (but if you do: http://stackoverflow.com/questions/15623698/angularjs-directive-isolate-scope-with-ng-repeat-scope)
    $scope.s = {};

    // node currently pointed to by the mouse (-1 if none)
    $scope.s.act_node = -1;

    // list of elements accumulated in each data vector position
    $scope.contains = [];

    // add k to the ith element
    var add = function (k, i) {
      i0 = i;
      $scope.trace_add[i0] = [];
      if (!i) {
        $scope.v[i] += k;
        $scope.trace_add[i0].push(i);
      }
      else {
        while (i <= $scope.end_element) {
          // only actually add to existing elements; the other ones (i > vlen) are only for diplaying the tree correctly
          if (i < $scope.vlen)
            $scope.v[i] += k;
          $scope.trace_add[i0].push(i);
          i += i & -i;
        }
      }
    }

    // return the ith prefix sum
    var pref_sum = function (i) {
      var i0 = i;
      $scope.trace_ps[i0] = [];
      var sum = 0;
      while (i) {
        sum += $scope.v[i];
        $scope.trace_ps[i0].push(i);
        i &= i - 1;
      }
      sum += $scope.v[0];
      $scope.trace_ps[i0].push(0);
      return sum;
    }

    var in_vec = function (x, v) {
      return v.findIndex(function(y) {return x == y});
    }

    // recalculate the whole tree
    var tree_reset = function () {
      // calculate the end element so that we can complete the add tree with non-existing elements for display
      $scope.end_element = ($scope.vlen - 1) << 1;
      while ($scope.end_element & ($scope.end_element - 1))
        $scope.end_element &= $scope.end_element - 1;

      reset_v();
      $scope.ps_v = [];
      for (var i = 0; i < $scope.vlen; i++) {
        add($scope.el_v[i], i);
        $scope.ps_v[i] = pref_sum(i);
      }
    }

    // recalculate display variables
    var tree_recalc = function (trace, root) {
      // translate the tree into child list and parent list formats
      var child_list = [];
      var parent_list = [];
      parent_list[root] = root;
      for (var i = 0; i <= $scope.vlen; i++)
        child_list.push([]);
      // add an entry for the root in case it's not zero (it's an update tree)
      child_list[root] = [];
      for (var i = 0; i < $scope.vlen; i++) {
        if (i != root) {
          var vec = trace[i];
          for (var j = 1; j < vec.length; j++) {
            // create entries for non-existing elements
            if (child_list[vec[j]] == undefined)
              child_list[vec[j]] = [];
            child_list[vec[j]].push(vec[j - 1]);
            parent_list[vec[j - 1]] = vec[j];
          }
        }
      }
      for (var i in child_list)
        if (root == 0)
          child_list[i] = _.uniq(child_list[i].sort(function(a, b) {return a - b}), true);
        else
          child_list[i] = _.uniq(child_list[i].sort(function(a, b) {return b - a}), true);

      // establish each element's "grid position" by counting leaves in each subtree
      var depth_list = [];
      var lat_list = []

      var leaves_dfs = function (i, depth, lat) {
        depth_list[i] = depth;
        lat_list[i] = lat;

        var leaves_below = 0;
        var vec = child_list[i];
        if (vec.length != 0)
          for (var j = 0; j < vec.length; j++)
            leaves_below += leaves_dfs(vec[j], depth + 1, lat + leaves_below);
        else
          leaves_below = 1;

        return leaves_below;
      }
      leaves_dfs(root, 0, 0);

      // calculate actual position in % from "grid position"
      var max_lat = _.max(lat_list);
      var max_depth = _.max(depth_list);
      var node_x = [];
      var node_y = [];
      var nodes = _.keys(parent_list);
      for (var i in nodes) {
        var guard_x = 4;
        var guard_y = 8;
        if (max_lat === 0)
          nx = 50;
        else
          nx = lat_list[nodes[i]] * (100 - 2 * guard_x) / max_lat + guard_x;
        ny = depth_list[nodes[i]] * (100 - 2 * guard_y) / max_depth + guard_y;
        node_x[nodes[i]] = nx.toString() + '%';
        node_y[nodes[i]] = ny.toString() + '%';
      }

      // angular apparently can't make ngIf or ngClass work for SVGs, so we have to precalculate everything in order to display non-existent nodes as separate elements "on top" of regular nodes
      var non_exist = [];
      var non_exist_parent = [];
      for (var i in nodes)
        if (nodes[i] >= $scope.vlen) {
          non_exist.push(nodes[i]);
          for (var j in child_list[nodes[i]])
            non_exist_parent.push(child_list[nodes[i]][j]);
      }

      return {
        non_exist:        non_exist,
        non_exist_parent: non_exist_parent,
        nodes:            nodes,
        parent:           parent_list,
        node_x:           node_x,
        node_y:           node_y
      };
    }

    $scope.recalc = function () {
      tree_reset();
      $scope.ps_d = tree_recalc($scope.trace_ps, 0);
      $scope.add_d = tree_recalc($scope.trace_add, $scope.end_element);
      $scope.s.act_node = -1;

      // recalculate list of elements contained in each data vector position
      var contains = [];
      for (var i = 0; i < $scope.vlen; i++) {
        contains[i] = [];
        for (var j = 0; j < $scope.vlen; j++)
          contains[i].push(false);
        for (var j = i; j > (i & (i - 1)); j--)
          contains[i][j] = true;
      }
      contains[-1] = [];
      contains[0][0] = true;
      $scope.contains = contains;
    }

    // initialize
    $scope.recalc();
  })
  .directive('trees', function () {
    return {
      templateUrl: '/res/fenwick-trees/trees.html'
    }
  });
